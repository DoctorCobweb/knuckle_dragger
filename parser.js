const globalConfig = require('./global-config');
const ESCPOS_DATA_LOG = globalConfig['ESCPOS_DATA_LOG'];
const ESCPOS_SINGLE_ORDER = globalConfig['ESCPOS_SINGLE_ORDER'];
const fs = require('fs');
const _ = require('lodash');
const npos = require('npos');
const nposParser = npos.parser();
const colors = require('colors');
const dbHandler = require('./dbHandler');
const DOCKET_START_FIELDS = [
  "RESTAURANT BAR",
  "TAB BAR",
  "JUKE BAR",
  "GAMING BAR", 
  "BOTTLESHOP",
  "SPORTS BAR",
];
const DOCKET_COURSE_FIELDS = [
  "ENTREES DINNER",
  "MAINS DINNER",
  "BAR MEALS",
  "CHILDS MENUS",
  "CHILDS DESSERT TOPS",
  "DESSERT",
  "ADD MODIFIERS",
  "SPECIAL INSTRUCTIONS",
];

// ------------------------------------------------------------
exports.parseSingleOrderOfBytes = parseSingleOrderOfBytes;
exports.parseManyOrdersOfBytes = parseManyOrdersOfBytes;
// ------------------------------------------------------------

function parseSingleOrderOfBytes (buffer) {
  nposParser.parse(buffer).then(function(ast) {
    npos.textualize(ast).then(function (results) {
      const data = cleanData(results);
      // console.log(data);
      // data is an array of strings
      orderToObjectLiteral(data);
    }).catch(err => {
      console.log('ERROR PARSER (textualize): '.red, err.message);
    });
  }).catch(err => {
    console.log('ERROR PARSER (parser): '.red, err.message);
  });
}

function cleanData (results) {
  // create a copy of results array
  var data = _.slice(results);
  var cleanedData_1 = _.reject(data, (s) => {
    return (
      s === '' || s === '\n' 
    );
  });
  var cleanedData_2 = _.map(cleanedData_1, (s) => {
    var temp;
    if (_.last(s) === '\n') {
      temp =  _.slice(s,0, s.length-1)
    } else {
      temp = s;
    }
    return temp.join("").toUpperCase();
  });
  return cleanedData_2;
}

// not really used at this stage. 
// moreso for manually checking whether 'escpos-data-log.bin' 
// contains the correct escpos data ie. it successfully parsers to
// display many orders.
function parseManyOrdersOfBytes (buffer) {
  nposParser.parse(buffer).then(function(ast) {
    npos.textualize(ast).then(function (results) {
      var orderData = {};
      const data = cleanData(results);
      orderData['orders'] = splitIntoSingleOrders(data);
      // console.log(JSON.stringify(data, null,2));
      dbHandler.insertManyOrders(orderData)
    }).catch(err => {
      console.log('ERROR PARSER (textualize): '.red, err.message);
    });
  }).catch(err => {
    console.log('ERROR PARSER (parser): '.red, err.message);
  });
}

function splitIntoSingleOrders(data) {
  var docketStartLocations = [];
  // find start locations of orders
  _.forEach(DOCKET_START_FIELDS, (field) => {
    //console.log(field);
    for (var i =0; i <= data.length; i++) {
      // console.log( cleanedData_2[i]);
      if (data[i] === field) {
        // console.log(field, 'found start at: ', i);
        docketStartLocations = _.concat(docketStartLocations, [i]);
      }
    }
  });
  // _.orderBy with no iteratees arg will sort by ascending order by default
  var sortedDocketStartLocations = _.orderBy(docketStartLocations);
  var orders = _.reduce(sortedDocketStartLocations, (acc, val, index, coll) => {
    if (index === coll.length) {
      var order = _.slice(data, sordedDocketStartLocations[index], data.length); 

      //TODO check this return works... it had _concat(acc,[order]); (no period .)
      return _.concat(acc, [order]);
    } else {
      var order = _.slice(data,sortedDocketStartLocations[index],sortedDocketStartLocations[index + 1]);
      return _.concat(acc, [order]);
    }
  }, []);
  return orders;
}

function orderToObjectLiteral (order) {
  //order will be an array of strings
  //
  // IMPORTANT: DOCKET SPECIFICATIONS
  // the following is the result of looking at many physical dockets and inferring the
  // structure. for various edge cases the structure changes slightly, and this 
  // affects how we should handle parsing the lines into relevant fields required
  // by db schema expectations.
  //
  // below, the lines refer to lines where text IS (we neglect the presence of empty
  // lines in the commentary)
  //
  // A) ALWAYS have
  // LINE 1: location e.g. "SPORTS BAR"
  // LINE 2: what device took the order e.g. "Table 4"
  // LINE 3: person who took the order e.g. "Clerk: Marlene"
  // LINE 4: when then order was taken e.g. "17/08/2018 17:24:04"
  //
  // B) VARIABLE content
  //
  // LINE 4: most times has table num/order number. MAY NOT BE PRESENT!(i.e. a staff meal)
  // LINE 5: booking name/walk-in: MAY NOT BE PRESENT
  // LINE 6: Covers number: MAY NOT BE PRESENT
  // LINE 7: extra weird info: "PRINT A/C - SARAH @ 19:11"
  //
  // C) ALWAYS have AT LEAST ONE docket course field.
  // LINE 8: docket course field (underlined field on phys docket) e.g. ENTREES DINNER
  // LINE 9+: meal item(s)
  //
  // TODO: error handling of string/regex extraction methods, operating on an assumed
  // non-empty array, order.
  //
  // IMPLEMENTATION TACTIC:
  // assume that A) above always exists, so it's valid to extract the first 4 lines:
  // LINE 1
  const location = order[0];
  // LINE 2
  const orderTakenUsing = order[1];
  // LINE 3
  // assume always of form "Clerk: Harry"
  const clerk = (order[2]).slice(order[2].indexOf(':')+2); 
  // LINE 4
  const orderSentAt = order[3];
  
  // due to B) variances we need to scan forward to our dependable docket course field.
  // once we find that, we can safely look at lines:
  //     LINE 4 < *lines* < LINE course field index
  // then the *lines* will contain our variable content which needs to be stepped though
  // carefully during our parsing.

  // variable content (!). careful.
  const tableNumber = order[4].split(/\s+/).slice(-1)[0]; // "Order no *20/0*"
  const customerName = (order[5]).slice(order[5].indexOf(':')+2);
  const covers = (order[6]).slice(order[6].indexOf(':')+2);

  // put basic templete here for now
  var template = {
    area: "",
    metaData: {},
    tableNumber: "",
    customerName: "",
    covers: "",
    meals: {
      "ENTREES DINNER":[],
      "MAINS DINNER":[],
      "BAR MEALS":[],
      "CHILDS MENUS":[],
      "CHILDS DESSERT TOPS":[],
      "DESSERT":[],
      "ADD MODIFIERS":[],
      "SPECIAL INSTRUCTIONS":[],
    }
  };

  template.area = location;
  template.metaData.orderTakenUsing = orderTakenUsing;
  template.metaData.clerk = clerk;
  template.metaData.orderSentAt = orderSentAt;
  template.tableNumber = tableNumber;
  template.customerName = customerName;
  template.covers = covers;

  // now need todo more work to get the meals object correctly segmented...
  // onwards.
  const trimmedLocations = getAllCourseFieldsLocations(order);

  // start building out the meal
  // go thru trimmedLocations and take slices from 'order' variable, for
  // a given course field
  const meals = buildOutMeals(order, trimmedLocations);
  template.meals = meals;
  dbHandler.insertSingleOrder(template);
}

function buildOutMeals (order, trimmedLocations) {
  var meals = {};
  _.forEach(trimmedLocations,(val, index, coll) => {
    const currentCourse = val[0];
    const currentCourseFieldIndex = val[1][0];
    var items;
    if (index === trimmedLocations.length - 1) {
      items = order.slice(currentCourseFieldIndex + 1, order.length); 
    } else {
      const nextCourseFieldIndex = trimmedLocations[index+1][1][0];
      items = order.slice(currentCourseFieldIndex + 1, nextCourseFieldIndex); 
    }
    const parsedItems = _.map(items, item => {
      var splitItem = item.split(/\s+/); // ["3","porterhouse","200"]
      var itemQuantity = splitItem[0];
      var itemName = splitItem.slice(1,splitItem.length).join(' ');
      return {quantity: itemQuantity, item: itemName};
    });
    meals[currentCourse] = parsedItems;
  });
  return meals;
}

function getAllCourseFieldsLocations (order) {
  const courseFieldsLocations = [];
  _.forEach(DOCKET_COURSE_FIELDS, course => {
    const locations = _.reduce(order, (acc, val, index, coll) => {
      if (course === val) {
        return _.concat(acc, [index]);
      } else {
        return acc;
      }
    }, []);

    //TODO:
    // ASSUMPTION: each course appears only once on the docket.
    // => need to look at many printed dockets to see whether assumption is valid.
    // *** MAYBE EACH COURSE APPEARS MORE THAN ONCE ON THE DOCKET
    // => locations = [12,56]; (say)
    courseFieldsLocations.push([course, locations]);
  });

  // only works is each course only appears ONCE on the docket
  // val is like ['MAINS DINNER', [12] ]
  const trimmedLocations = _.reject(
    _.sortBy(courseFieldsLocations, val => {return val[1][0]})
    , val => {return _.isEmpty(val[1])}
  );

  // console.log(order);
  // console.log('courseFieldsLocations: ', courseFieldsLocations );
  // console.log('trimmedLocations: ', trimmedLocations);

  return trimmedLocations;
}

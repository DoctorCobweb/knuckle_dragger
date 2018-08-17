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
  "JUKE BAR",
  "TAB BAR",
  "GAMING BAR", // TODO: check this name using actual dockets
  "BOTTLESHOP",
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
  //specs
  //1. first element of orders will always be the location
  //2. always have 3 lines in the docket for some of the meta data
  const location = order[0];
  const orderTakenUsing = order[1];
  const clerk = (order[2]).slice(order[2].indexOf(':')+2);
  const orderSent = order[3];
  const tableNumber = order[4];
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
  template.metaData.orderSent = orderSent;
  template.tableNumber = tableNumber;
  template.customerName = customerName;
  template.covers = covers;

  // now need todo more work to get the meals object correctly segmented...
  // onwards.

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

  // start building out the meal
  // go thru trimmedLocations and take slices from 'order' variable, for
  // a given course field
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
    template.meals[currentCourse] = items;
  });
  dbHandler.insertSingleOrder(template);
}

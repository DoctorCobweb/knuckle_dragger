// TODO:
// 1. fix parsing extra info for items

const globalConfig = require('./global-config');
const menuItems = require('./menuConstants').menuItems;
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
  "MAINS LUNCH",
  "BAR MEALS",
  "CHILDS MENUS",
  "CHILDS DESSERT TOPS",
  "DESSERT",
  "ADD MODIFIERS",
  "SPECIAL INSTRUCTIONS",
];

// console.log(menuItems);

// ------------------------------------------------------------
exports.parseSingleOrderOfBytes = parseSingleOrderOfBytes;
// ------------------------------------------------------------

function parseSingleOrderOfBytes (buffer) {
  nposParser.parse(buffer).then(function(ast) {
    npos.textualize(ast).then(function (results) {
      const data = sanitize(results);
      // console.log(colors.yellow(data));
      // data is an array of strings
      orderToObjectLiteral(data);
    }).catch(err => {
      console.log('ERROR PARSER (textualize): '.red, err.message);
    });
  }).catch(err => {
    console.log('ERROR PARSER (parser): '.red, err.message);
  });
}

function sanitize(results) {
  let data = _.slice(results);
  data = _.map(data, line => {
    return line.split('\n');
  });
  data = _.flattenDeep(data);
  data = _.reject(data, val => {
    return val === '';
  });
  data = _.map(data, line => {
    return line.trim();
  });

  // the hotel docket template always contains a line of '-----------------' at the end
  // => it will be prudent of us to remove it now, as later on when it comes to finding
  // a menu item's special instructions aka 'info'we will rely on '-----------' to 
  // delineate separation of multiply present infos. 
  // viz: 
  //     4     GARLIC BREAD
  //     1  ex butter
  //     1  ex cheese
  //     --------------
  //     1  no garlic
  //     1  add tomato relish
  //     1  no bread
  //     -------------
  //     1  no air in bread
  //     1  add chilli
  //     1  smile
  //     3    OYSTERS NAT 1
  //     ....
  const lastLineChars = _.uniq(_.last(data));
  // we want lastLineChars to be ['-']
  if ( lastLineChars.length === 1 && lastLineChars[0] === '-' ) {
    // we can be sure that we have a line of '------------' (after any spaces are removed)
    console.log('REMOVING last line of --------');
    return _.initial(data);
  } else {
    return data;
  }
}


function orderToObjectLiteral (order) {
  //order will be an array of strings. but before going further check that the array
  //has minimal expected content. namely: area, orderTakenUsing, clerk, orderSentAt.
  // otherwise throw error, for now.
  if (order.length < 4) {
    throw Error('ERROR: order array is below minimal expected length. parse error...');
  }

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

  // ****************************************
  // IMPORTANT: DOCKET SPECIFICATIONS
  // ****************************************
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

  // B) VARIABLE content
  // LINE 4: most times has table num/order number. MAY NOT BE PRESENT!(i.e. a staff meal)
  // LINE 5: booking name/walk-in: MAY NOT BE PRESENT
  // LINE 6: Covers number: MAY NOT BE PRESENT
  // LINE 7: extra weird info: "PRINT A/C - SARAH @ 19:11"

  // C) ALWAYS have AT LEAST ONE docket course field.
  // LINE 8: docket course field (underlined field on phys docket) e.g. ENTREES DINNER
  // LINE 9+: meal item(s)

  // TODO: error handling of string/regex extraction methods,

  // START
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
  
  // NEXT UP
  // due to B) variances we need to scan forward to our dependable docket course field.
  // once we find that, we can safely look at lines:
  //     LINE 4 < *lines* < LINE course field index
  // then the *lines* will contain our variable content which needs to be stepped though
  // carefully during our parsing.

  // be verbose:
  const variableContentStart = 4;

  // trimmedLocations is like [ val, val, ..., val]
  // where val is like ['MAINS DINNER', [12] ]
  // ==> 12 is the index of MAINS DINNER in 'order' variable.
  const trimmedLocations = getAllCourseFieldsLocations(order);

  // we use the firstCourseField as a way to identify any variable content on the
  // docket. see below for details
  var firstCourseField;
  if (trimmedLocations.length > 0) {
    firstCourseField = trimmedLocations[0][1][0];
  } else {
    throw Error('ERROR: firstCourseField cannot be found in trimmedLocations array');
  }

  const variableContent = order.slice(variableContentStart, firstCourseField);
  console.log('variableContent: '.red, variableContent);
   
  // now look at each element of variableContent, searching for existence of substrings
  // 1. "TABLE No *15/0*
  // 2. "ORDER NUMBER 1"
  // 3. "Name: Walk-in"
  // 4. "Covers: 10"
  // 5. other extra weird info: "PRINT A/C - SARAH @ 19:11"

  var extraContent = handleExtraVariableContent(variableContent);

  var tableNumber = "";
  const vTableNumber = _.find(variableContent, line => {
    const lineUpper = line.toUpperCase();
    return (lineUpper.includes("TABLE NO") || lineUpper.includes("ORDER NUMBER"));
  });
  if (vTableNumber) {
    // handle the two different cases similarly.
    // "TABLE No *20/0*" ==> "*20/0*"
    // "ORDER NUMBER 1" ==> "1"
    tableNumber = vTableNumber.split(/\s+/).slice(-1)[0];
  }

  var customerName = "";
  const vCustomerName = _.find(variableContent, line => {
    const nameUpper = line.toUpperCase();
    return nameUpper.includes("NAME:");
  });
  if (vCustomerName) {
    // "Name: Hillary"
    customerName = vCustomerName.slice(vCustomerName.indexOf(':') + 2);
  }

  var covers = "";
  const vCovers = _.find(variableContent, line => {
    const coversUpper = line.toUpperCase();
    return coversUpper.includes("COVERS:");
  });
  if (vCovers) {
    // "Covers: 10"
    covers = vCovers.slice(vCovers.indexOf(':') + 2);
  }

  template.area = location;
  template.metaData.orderTakenUsing = orderTakenUsing;
  template.metaData.clerk = clerk;
  template.metaData.orderSentAt = orderSentAt;
  template.metaData.extraContent = extraContent;
  template.tableNumber = tableNumber;
  template.customerName = customerName;
  template.covers = covers;


  const _menuItemIdxs = menuItemIdxs(order, trimmedLocations);

  // start building out the actual meal contents.
  // go thru trimmedLocations and take slices from 'order' variable, for
  // a given course field
  const meals = buildOutMeals(order, trimmedLocations, _menuItemIdxs);
  template.meals = meals;
  dbHandler.insertSingleOrder(template);
}

function handleExtraVariableContent(variableContent) {
  //----------------------------------------
  // REALLY CRAPPY CODE => it's working but need to refactor it. later
  //----------------------------------------
  // this is used to check for super weird extra variable content (pt 5 immediatley
  // above)
  const variableContentKeys = [
    "NAME:",
    "TABLE NO",
    "ORDER NUMBER",
    "COVERS:",
  ];

  var standardContentIndices = _.map(variableContentKeys, (key) => {
    var _index;
    const res = _.find(variableContent, (val, index) => {
      _index = index;
      return val.toUpperCase().includes(key);
    });
    if (res) {
      return _index;
    }
  });

  console.log('standardContentIndices: ', standardContentIndices);
  //remove any undefined elements
  standardContentIndices = _.reject(standardContentIndices, val => {
    return val === undefined;
  });
  console.log('standardContentIndices: ', standardContentIndices);

  var variableContentCopy = variableContent.slice();

  _.forEach(standardContentIndices, val => {
    delete variableContentCopy[val];
  });
  var extraContent = _.reject(variableContentCopy, val => {
    return val === undefined;
  });

  if (_.isEmpty(extraContent)) {
    extraContent = "";
    console.log('no extraContent');
  } else {
    extraContent = extraContent.join(' ');
    console.log('we have extra content: ', extraContent);
  }
  return extraContent;
}

function menuItemIdxs(order, trimmedLocations) {
  const firstCourseIdx = trimmedLocations[0][1][0];

  // copy and use only the part of the order we're interested in here.
  // that's from first course name to end of order.
  let orderCopy = order.slice(firstCourseIdx, order.length);

  orderCopy = _.map(orderCopy, line => {
      const splitItem = line.split(/\s+/);
      if (isNaN(parseInt(splitItem[0]))) {
        // item is like "add gravy" or "--------------"
        // sometimes you dont get a number at start of string
        // this affects how we also extract itemName
        //console.log(colors.red(item));
        //itemName = splitItem.slice(0,splitItem.length).join(' ');
        return splitItem.join(' ');
      } else {
        // item is like "3 porterhouse 200"
        // quantity number is first item
        // quantity name is from element 1 till end
        return splitItem.slice(1,splitItem.length).join(' ');
      }
  });

  // use menuItems in the form a set (fast extistence operator) to find where menu items
  // are located.
  const menuItemsSet = new Set(menuItems);
  const menuItemIdxs = _.reduce(orderCopy, (acc, line, index, coll) => {
    // see if line is a menu item by checking if it's in menuItems
    // if it is, then put (index + firstCourseIndex) into acc
    // else, just return acc
    if (menuItemsSet.has(line)) {
      return _.concat(acc, [index + firstCourseIdx]);
    } else {
      return acc;
    }
  }, []);
  return menuItemIdxs;
}

function buildOutMeals (order, courseLocations, menuItemIdxs) {
  console.log(colors.blue(courseLocations));
  console.log(colors.blue(menuItemIdxs));
  console.log(colors.yellow(order));

  // TODO: implement the extraction of menu item info
  // - use menuItemIdxs for slice info-array
  // - then, within each info-array make sure to check for multiple 'infos' 
  //   delineated with a line of dashes '---------'.
  //   viz:
  //      3 CHILDS RICE
  //      1 ex chilli   | an 'info'
  //      1 ex chicken  |
  //      -----------
  //      1 no egg      | another 'info'
  //      1 add soy     |
  //      -----------
  //      5 NASI
  //      ....
  
  let infoSlices = _.reduce(menuItemIdxs, (acc, val, idx, coll) => {
    // val is the index of a menu item in orders array
    
    if (idx === coll.length - 1) {
      // at end of menuItemIdxs
      const start = val+1;
      const end = order.length;
      const info = order.slice(start, end);
      return _.concat(acc, [info]);
    } else {
      // not at last element of menuItemIdxs
      const start = val+1;
      const end = menuItemIdxs[idx + 1];
      const info = order.slice(start, end); 
      return _.concat(acc, [info]);
    }
  }, []);
  console.log(colors.red(infoSlices));

  // sometimes the course name gets swepped up in a menu's info item.
  // e.g. infoSlices is like:
  // [ ['1   MED RARE',
  //    '1   MUSH'],
  //   ['1   MED RARE',
  //    '1   MUSH',
  //     'MAINS DINNER'], <= see this. it shouldnt be in the array. delete element. 
  //   ...
  //   ['DESSRT'], <= see this. it shouldn't be in the array. delete element => []
  //   ['1   EXTRA ICE CREAM',
  //    '1   EXTRA COLD'],
  //   ...
  // ]
  // we could carefully step thru menuItemIdxs whilst looking to see if we cross into
  // a new course,
  // OR
  // we can simply just accept that this happens and delete any course names from any 
  // of the menu info array.
  // let's adopt the latter...


  infoSlices = _.map(infoSlices, anInfoArray => {
    if (_.isEmpty(_.intersection(anInfoArray, DOCKET_COURSE_FIELDS))) {
      // anInfoArray doesn't contain any course names. dont need to remove anything.
      return anInfoArray;
    } else {
      // there is a course name in our anInfoArray. remove it.
      const coursesSet = new Set(DOCKET_COURSE_FIELDS);

      // first find all locations of course names.
      // DONT ASSUME THAT THERE'S ONLY ONE COURSE NAME PRESENT. THERE COULD BE >1.
      return _.reduce(anInfoArray, (acc, val, idx, coll) => {
        if (coursesSet.has(val)) {
          // val is a course name...
          // need to drop this from anInfoArray.
          // this amounts to just returning acc 
          return acc;
        } else {
          // val is needed to be kept. it is not a course name
          // add it to acc
          return _.concat(acc,[val]);
        }
      }, []);
    }
  }); 
  console.log(colors.green(infoSlices));

}


function _buildOutMeals (order, trimmedLocations, menuItemIdxs) {
  // where trimeedLocations is like:
  // [ ['ENTREES DINNER', [9] ],
  //   ['MAINS DINNER', [12] ],
  //   ['DESSERTS', [15] ],
  // ]
  //   
  var meals = {};
  _.forEach(trimmedLocations, (val, index, coll) => {
    const currentCourse = val[0];
    const currentCourseFieldIndex = val[1][0];

    // items constains all the lines for a given course, including item info lines
    var items;
    if (index === trimmedLocations.length - 1) {
      items = order.slice(currentCourseFieldIndex + 1, order.length); 
    } else {
      const nextCourseFieldIndex = trimmedLocations[index+1][1][0];
      items = order.slice(currentCourseFieldIndex + 1, nextCourseFieldIndex); 
    }
    const parsedItems = _.map(items, (item, idx) => {
      // first item is USUALLY a number. but sometimes it's not. careful
      var parsedItem = {};
      var itemQuantity;
      var itemName;
      var splitItem = item.split(/\s+/);
      if (isNaN(parseInt(splitItem[0]))) {
        // item is like "add gravy"
        // sometimes you dont get a number at start of string
        // this affects how we also extract itemName
        console.log('WARNING: we have an item with no quantity number at start'.red);
        console.log(colors.red(item));
        itemQuantity = "";
        //itemName = splitItem.slice(0,splitItem.length).join(' ');
        itemName = splitItem.join(' ');
      } else {
        // item is like "3 porterhouse 200"
        // quantity number is first item
        // quantity name is from element 1 till end
        itemQuantity = splitItem[0];
        itemName = splitItem.slice(1,splitItem.length).join(' ');
      }
      parsedItem.quantity = itemQuantity;
      parsedItem.item = itemName;
      parsedItem.info = []; 

      return parsedItem;
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

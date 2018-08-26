// TODO: write out what each token means in reference to a docket.

const colors = require('colors');
const _ = require('lodash');
const npos = require('npos');
const nposParser = npos.parser();
const mc = require('./menuConstants');
const async = require('async');

const tokens = {
  "Venue Location":      "VL",
  "Meta Data":           "MD", // table num, booking name, covers, "PRINT A/C..."
  "Course Name":         "CN",
  "Menu Item":           "MI",
  "Item Info":           "II",
  "Item Info Separator": "IIS", // which is '  -------------'
  "Random Content":      "RC",
  "End Of Docket":       "EOD",
  "Error":               "ERR" // tokenization failed: catch all errors token
};

exports.parseSingleOrder = parseSingleOrder;

function parseSingleOrder(buffer) {
  nposParser.parse(buffer)
    .then(ast => {
      npos.textualize(ast)
        .then(results => {
          //do somethine with the array of strings
          let data = sanitize(results);
          console.log(colors.green(data));
          data = tokenizeData(data);
          console.log(colors.blue(data));
        })
        .catch(err => {
          console.log('ERROR PARSER (textualize): '.red, err.message);
        });
    })
    .catch(err => {
      console.log('ERROR PARSER (parser): '.red, err.message);
    });
}

function sanitize(results) {
  let data = _.slice(results);
  data = _.map(data, line => {
    return line.split('\n');
  });
  data = _.flattenDeep(data);
  data = _.reject(data, line => {
    return line === '';
  });
  data = _.map(data, line => {
    return line.trim().toUpperCase();
  });
  return data;
}

function tokenizeData(data) {
  let tokenizedData;
  // go thru each line and check through tokens
  tokenizedData = _.map(data, (line, idx) => {
    //TODO: handle each line
    if (idx == 0 && tokenVL(line)) {
      // at start of docket
      return tokens["Venue Location"];
    } else if (idx > 0 && idx < 4 && tokenMD(line)) {
      // every docket is guarenteed to have at least 3 lines of meta data
      // 1. device used to take order
      // 2. staff member who took order
      // 3. time order was taken
      return tokens["Meta Data"];
    } else {
      // everything else is assumed to be variable. that is it may or may not
      // be present on docket (yes, even table number is not present sometimes)

      return handleScan();
    }
  });

  // TODO: include the index also in the zip data structure
  return _.zip(data, tokenizedData); 
}

function handleScan(line) {
  async.series([
    function(callback) {
      const decision = tokenMD();
      const key = tokens["Meta Data"];
      const _obj = {key: decision};
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenCN();
      const key = tokens["Course Name"];
      const _obj = {key: decision};
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenMI();
      const key = tokens["Menu Item"];
      const _obj = {key: decision};
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenII();
      const key = tokens["Item Info"];
      const _obj = {key: decision};
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenIIS();
      const key = tokens["Item Info Separator"];
      const _obj = {key: decision};
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenRC();
      const key = token["Random Content"];
      const _obj = {key: decision};
      callback(null, _obj);
    },
    function (callback) {
      const decision = tokenEOD();
      const key = tokens["End Of Docket"];
      const _obj = {key: decision};
      callback(null, _obj);
    },
    function (callback) {
      const decision = tokenERR();
      const key = tokens["Error"];
      const _obj = {key: decision};
      callback(null, _obj);
    },
    ],
    function (err, results) {
      if (err) {
        throw Error('ERROR: aysnc.series tokenization had a problem. check.');
      }
      // results should now be an array of
      // [ {MD: false},
      //   {TN: false},
      //   {CN: false},
      //   {MI: true},
      //   {II: false},
      //   {IIS: false},
      //   {RC: false},
      //   {EOD: false},
      //   {ERR: false},
      //   ]
      //
      // the value for which is true represents the token which line is

      // TODO: return the correct token from looking at results array of objects
      return results;
  });
}

function tokenVL (line) {
  // VL:  "Venue Location",
  return _.includes(mc.docketStartFields, line);
}

function tokenMD (line) {
  // MD:  "Meta Data",
  return _.some(mc.metaContentKeys, val => {return line.includes(val)});
}

function tokenCN (line) {
  // CN:  "Course Name",
  return _.some(mc.courseFields, val => {return line.inclues(val)});

}

function tokenMI (line) {
  // MI:  "Menu Item",
  // a standard menu item is like:
  //     "1 NASI"
  // gotta handle the presence of numbers in the line...we're only after the 
  // menu item name, not quantity.
  const splitLine = line.split(/\s+/);
  if (isNaN(parseInt(splitLine[0]))) {
    // => first element of splitLine is not able to be parsed to an integer.
    // => that means it's NOT a number.
    // the line could be like "SPECIAL INSTRUCTIONS" (which is a course field)
    // => we should then return false 
    return false;
  } else {
    // we have a candidate for a menu item.
    // we need to be careful because item info lines
    // will also have a number as their first element in splitLine.
    // e.g. menu item will look like splitLine = ["2", "SALMON"]
    //      a menu item's info will be like splitLine = ["1", "cooked well done"]
    // now join the item back, disregarding the first element (which is a quantity)
    const rejoinedItem = splitItem.slice(1,splitItem.length).join(' ');

    // now look to see if it's in the menu items.
    // if so, then it's a menu item, token === MI
    // otherwise, it's an item info line, token === II, BUT FOR NOW WE ONLY RETURN
    // true or false in regards to the presence of a menu item.
    return _.includes(mc.menuItems, rejoinedItem);
  }
}

// TODO: IMPORTANT: if item info line so happens to be equal to an item onf the menu
//       then it will be picked up as a menu item ????
function tokenII (line) {
  // II:  "Item Info",
  // this function is very similar to tokenMI.
  const splitLine = line.split(/\s+/);
  if (isNaN(parseInt(splitLine[0]))) {
    return false;
  } else {
    const rejoinedItem = splitItem.slice(1, splitItem.length).join(' ');

    // NOTICE THE ! in front of _.includes(...) 
    // => if line starts with a number but is not found in menuItems then assume that
    //    means it's an item info line.
    //    item info lines (from inspection of physical dockets) start with a number '1'
    return !_.includes(mc.menuItems, rejoinedItem);
  }
}

function tokenIIS (line) {
  // TODO
  // IIS: "Item Info Separator",
}

function tokenRC (line) {
  // TODO
  // RC:  "Random Content",
}

function tokenEOD (line) {
  // TODO
  // EOD: "End Of Docket"
}

function tokenERR (line) {
  // TODO
  // ERR: "Error"
  // return "ERR";
}

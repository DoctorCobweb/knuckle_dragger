const colors = require('colors');
const _ = require('lodash');
const npos = require('npos');
const nposParser = npose.parser();
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
    return line.trim();
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
      const _obj = {tokens["Meta Data"]: decision};
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenCN();
      const _obj = {tokens["Course Name"]: decision};
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenMI();
      const _obj = {tokens["Menu Item"]: decision};
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenII();
      const _obj = {tokens["Item Info"]: decision};
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenIIS();
      const _obj = {tokens["Item Info Separator"]: decision};
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenRC();
      const _obj = {tokens["Random Content"]: decision};
      callback(null, _obj);
    },
    function (callback) {
      const decision = tokenEOD();
      const _obj = {tokens["End Of Docket"]: decision};
      callback(null, _obj);
    },
    function (callback) {
      const decision = tokenERR();
      const _obj = {tokens["Error"]: decision};
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
  return _.includes(mc.metaContentKeys);
}

function tokenCN (line) {
  // TODO
  // CN:  "Course Name",
}

function tokenMI (line) {
  // TODO
  // MI:  "Menu Item",
}

function tokenII (line) {
  // TODO
  // II:  "Item Info",
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

const colors = require('colors');
const _ = require('lodash');
const npos = require('npos');
const nposParser = npose.parser();
const mc = require('./menuConstants');

const tokens = {
  VL:  "Venue Location",
  MD:  "Meta Data",
  TN:  "Table Number",
  SP:  "SPace",
  CN:  "Course Name",
  MI:  "Menu Item",
  II:  "Item Info",
  IIS: "Item Info Separator", // which is '  -------------'
  RC:  "Random Content",
  EOD: "End Of Docket",
  ERR: "Error" // tokenization failed for a line which is assigned this val
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
    return line;
  });
  return _.zip(data, tokenizedData); 
}



function tokenVL (line) {
  // VL:  "Venue Location",
  return _.includes(mc.docketStartFields, line)
}
function tokenMD (line) {
  // MD:  "Meta Data",
}

function tokenTN (line) {
  // TN:  "Table Number",
}

function tokenSP (line) {
  // SP:  "SPace",
}

function tokenCN (line) {
  // CN:  "Course Name",
}

function tokenMI (line) {
  // MI:  "Menu Item",
}

function tokenII (line) {
  // II:  "Item Info",
}

function tokenIIS (line) {
  // IIS: "Item Info Separator",
}

function tokenRC (line) {
  // RC:  "Random Content",
}

function tokenEOD (line) {
  // EOD: "End Of Docket"
}

function tokenERR (line) {
  // ERR: "Error"
  return "ERR";
}





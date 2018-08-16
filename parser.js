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

// ------------------------------------------------------------
exports.parseSingleOrder = parseSingleOrder;
exports.parseManyOrders = parseManyOrders
// ------------------------------------------------------------

function parseSingleOrder (buffer) {
  nposParser.parse(buffer).then(function(ast) {
    npos.textualize(ast).then(function (results) {
      const data = cleanData(results);
      // console.log(data);
      dbHandler.insertSingleOrder(data)
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
function parseManyOrders (buffer) {
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
      return _concat(acc, [order]);
    } else {
      var order = _.slice(data,sortedDocketStartLocations[index],sortedDocketStartLocations[index + 1]);
      return _.concat(acc, [order]);
    }
  }, []);
  return orders;
}

const globalConfig = require('./global-config');
const r = require('rethinkdb');

// ------------------------------------------------------------
exports.insertSingleOrder = insertSingleOrder; 
exports.insertManyOrders = insertManyOrders; 
// ------------------------------------------------------------

function insertSingleOrder(order) {
  // order is an array of strings
  // ['blah','yadda',....,'foo']
  console.log('heeloo from insertSingleOrder');
}

function insertManyOrders(orders) {
  //orders is an array of arrays of strings
  //[['blah','yadda',...,'foo'], ['blah', 'yadda',...,'foo'],....]
  console.log('heeloo from insertManyOrders');
}


const globalConfig = require('./global-config');
const dbHost= globalConfig['DB_HOST'];
const dbPort = globalConfig['DB_PORT'];
const dbName = globalConfig['DB_NAME'];
const dbTableName= globalConfig['DB_TABLE_NAME'];
const r = require('rethinkdb');

// ------------------------------------------------------------
exports.insertSingleOrder = insertSingleOrder; 
exports.insertManyOrders = insertManyOrders; 
// ------------------------------------------------------------

function insertSingleOrder(order) {
  // order is an array of strings
  // ['blah','yadda',....,'foo']

  // rethinkdb expects an Object to insert
  var item = {order:order};

  console.log('heeloo from insertSingleOrder');
  console.log(item);

  // everytime insertSingleOrder is called, as new connection
  // is made to the db. good/bad??
  r.connect({
    host: dbHost,
    port: dbPort
  })
  .then(conn => {
    r.db(dbName).table(dbTableName)
      .insert(item)
      .run(conn)
      .then(results => {
        console.log('SUCCESS: inserted a single order');
        console.log(results);
      })
      .catch(err => {
        if (err) throw err;
      });
  })
  .catch(err => {
    if (err) throw err;
  });
}

function insertManyOrders(orders) {
  //orders is an array of arrays of strings
  //[['blah','yadda',...,'foo'], ['blah', 'yadda',...,'foo'],....]
  console.log('heeloo from insertManyOrders');
}

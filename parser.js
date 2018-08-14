var fs = require('fs');
var _ = require('lodash');
var npos = require('npos');
var parser = npos.parser();
OUTPUT_FILENAME = 'escpos-data.bin';


var DOCKET_START_FIELDS = [
  "RESTAURANT BAR",
  "JUKE BAR",
  "TAB BAR",
  "GAMING BAR", // TODO: check this name using actual dockets
  "BOTTLESHOP",
];

orderParser(OUTPUT_FILENAME);

function orderParser (fileName) {
  var buffer = fs.readFileSync(fileName);

  parser.parse(buffer).then(function(ast) {
    //console.log(ast);

    npos.textualize(ast).then(function (results) {
      // console.log(results);

      // create a copy of results array
      var data = _.slice(results);

      var cleanedData_1 = _.reject(data, (o) => {
        return (
          o === '' || o === '\n'
        );
      });

      var cleanedData_2 = _.map(cleanedData_1, (o) => {
        var temp;
        if (_.last(o) === '\n') {
          temp =  _.slice(o,0, o.length-1)
        } else {
          temp = o;
        }

        return temp.join("").toUpperCase();
      });


      var docketStartLocations = [];

      // find start locations of orders
       _.forEach(DOCKET_START_FIELDS, (field) => {
        //console.log(field);
        for (var i =0; i <= cleanedData_2.length; i++) {
          // console.log( cleanedData_2[i]);
          if (cleanedData_2[i] === field) {
            // console.log(field, 'found start at: ', i);
            docketStartLocations = _.concat(docketStartLocations, [i]);
          }
        }
      });


      // _.orderBy with no iteratees arg will sort by ascending order by default
      var sortedDocketStartLocations = _.orderBy(docketStartLocations);

      // console.log(cleanedData_2);

      var orders = _.reduce(sortedDocketStartLocations, (acc, val, index, coll) => {
        if (index === coll.length) {
          var order = _.slice(cleanedData_2, sordedDocketStartLocations[index], cleanedData_2.length); 
          return _concat(acc, [order]);
        } else {
          var order = _.slice(cleanedData_2,sortedDocketStartLocations[index],sortedDocketStartLocations[index + 1]);
          return _.concat(acc, [order]);
        }
      }, []);

      // console.log(orders);

      var orderData = {};
      orderData['orders'] = orders;

      console.log('NOT sorted docket start locations: ', docketStartLocations);
      console.log('sortedDocketStartLocations: ', sortedDocketStartLocations);
      console.log(JSON.stringify(orderData, null,2));
    });
  });

}

exports.orderParser = orderParser;

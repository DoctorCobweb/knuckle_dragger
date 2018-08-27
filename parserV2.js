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
  // remove last line of dashes if it's present
  data = isLineAllDashes(_.last(data)) ? _.initial(data) : data;
  return data;
}

function tokenizeData(data) {
  // go thru each line and check through tokens
  const tokenizedData = _.reduce(data, (acc, line, idx) => {
    console.log(colors.blue(line));

    if (idx == 0 && tokenVL(line)) {
      // at start of docket
      // return tokens["Venue Location"];
      return _.concat(acc, [tokens["Venue Location"]]);
    } else if (idx > 0 && idx < 4) {
      console.log('0 < idx < 4');
      // every docket is guarenteed to have at least 3 lines of meta data
      // 1. device used to take order
      // 2. staff member who took order
      // 3. time order was taken
      // return tokens["Meta Data"];
      return _.concat(acc, [tokens["Meta Data"]]);

    } else {
      console.log('above async.series...');
      // everything else is assumed to be variable.
      // that is it may or may not be present on docket
      // (yes, even table number is not present sometimes)

      /*
      async.series([
        function(callback) {
          const decision = tokenMD(line);
          // const key = tokens["Meta Data"];
          const _obj = {"Meta Data": decision};
          console.log('tokenMD', _obj);
          callback(null, _obj);
        },
        function(callback) {
          const decision = tokenCN(line);
          // const key = tokens["Course Name"];
          const _obj = {"Course Name": decision};
          console.log('tokenCN', _obj);
          callback(null, _obj);
        },
        function(callback) {
          const decision = tokenMI(line);
          // const key = tokens["Menu Item"];
          const _obj = {"Menu Item": decision};
          console.log('tokenMI', _obj);
          callback(null, _obj);
        },
        function(callback) {
          const decision = tokenII(line);
          // const key = tokens["Item Info"];
          const _obj = {"Item Info": decision};
          console.log('tokenII', _obj);
          callback(null, _obj);
        },
        function(callback) {
          const decision = tokenIIS(line);
          // const key = tokens["Item Info Separator"];
          const _obj = {"Item Info Separator": decision};
          console.log('tokenIIS', _obj);
          callback(null, _obj);
        }],
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
          //   ]
          //
          // the value for which is true represents the token which line is

          const _tokens = _.reduce(results, (acc, tokenResult) => {
            if (Object.values(tokenResult)[0]) {
              return _.concat(acc, [tokenResult]);
            } else {
              return acc;
            }
          }, []);

          console.log('_tokens: ', _tokens);

          // if tokens is empty then assign line as Random Content, RC.
          // if multiple tokens assigned to one line the throw error. should only find one.
          // else, return the found token.
          if (_.isEmpty(_tokens)) {
            // return tokens["Random Content"];
            return _.concat(acc, [tokens["Random Content"]]);
          } else if (_tokens.length > 1) {
            throw Error('ERROR: multiple tokens for one line. should only have one'.red);
          } else {
            const ourToken = Object.keys(_tokens[0])[0];
            console.log(colors.red(ourToken));
            // return tokens[ourToken];
            return _.concat(acc, [tokens[ourToken]]);
          }
      });
      */


      return _.concat(acc, [tokens["Meta Data"]]);

      // const result = handleScan(line);
      // console.log('handleScan: '.yellow, result, tokens[result]);
      // return tokens[handleScan(line)];
    }
  }, []);
  const idxs = _.map(Array(data.length), (val, idx) => {return idx});
  console.log(colors.red(tokenizedData));
  return _.zip(data, tokenizedData, idxs); 
}

// IMPORTANT:
// => in series, try to assign line to the following tokens:
//    1. MD
//    2. CN
//    3. MI
//    4. II
//    5. IIS
// then if the line doesnt get assigned one of the above, assign it as Random Content
function handleScan(line) {
  async.series([
    function(callback) {
      const decision = tokenMD(line);
      // const key = tokens["Meta Data"];
      const _obj = {"Meta Data": decision};
      console.log('tokenMD', _obj);
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenCN(line);
      // const key = tokens["Course Name"];
      const _obj = {"Course Name": decision};
      console.log('tokenCN', _obj);
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenMI(line);
      // const key = tokens["Menu Item"];
      const _obj = {"Menu Item": decision};
      console.log('tokenMI', _obj);
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenII(line);
      // const key = tokens["Item Info"];
      const _obj = {"Item Info": decision};
      console.log('tokenII', _obj);
      callback(null, _obj);
    },
    function(callback) {
      const decision = tokenIIS(line);
      // const key = tokens["Item Info Separator"];
      const _obj = {"Item Info Separator": decision};
      console.log('tokenIIS', _obj);
      callback(null, _obj);
    }],
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
      //   ]
      //
      // the value for which is true represents the token which line is

      const tokens = _.reduce(results, (acc, tokenResult) => {
        if (Object.values(tokenResult)[0]) {
          return _.concat(acc, [tokenResult]);
        } else {
          return acc;
        }
      }, []);

      console.log('tokens: ', tokens);

      // if tokens is empty then assign line as Random Content, RC.
      // if multiple tokens assigned to one line the throw error. should only find one.
      // else, return the found token.
      if (_.isEmpty(tokens)) {
        return "Random Content";
      } else if (tokens.length > 1) {
        throw Error('ERROR: multiple tokens for one line. should only have one'.red);
      } else {
        console.log(colors.red(Object.keys(tokens[0])[0]));
        return Object.keys(tokens[0])[0];
      }
  });
}

function tokenVL (line) {
  // VL:  "Venue Location",
  console.log('VL');
  return _.includes(mc.docketStartFields, line);
}

function tokenMD (line) {
  // MD:  "Meta Data",
  console.log('MD');
  // console.log(mc.metaContentKeys);
  const blah = _.some(mc.metaContentKeys, val => {
    const yadda = line.includes(val);
    // console.log(line, val, yadda);
    return yadda;
  });
  // console.log(blah);
  return blah;
}

function tokenCN (line) {
  // CN:  "Course Name",
  console.log('CN');
  return _.some(mc.courseFields, val => {
    return val === line;
  });
}

function tokenMI (line) {
  console.log('MI');
  // MI:  "Menu Item",
  //
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
    const rejoinedItem = splitLine.slice(1,splitLine.length).join(' ');

    // now look to see if it's in the menu items.
    // if so, then it's a menu item, token === MI
    // otherwise, it's an item info line, token === II, BUT FOR NOW WE ONLY RETURN
    // true or false in regards to the presence of a menu item.
    // => dont handle both MI and II in this function.
    return _.includes(mc.menuItems, rejoinedItem);
  }
}

function tokenII (line) {
  console.log('II');
  // IMPORTANT
  // if item info line so happens to be equal to an item on the menu
  // then it will be picked up as a menu item!
  // => assume that this is a rare event, and if it does happen then it will just
  // show up as a menu item and can (may) be easilt fixed with human intervention
  //
  // II:  "Item Info",
  // this function is very similar to tokenMI.
  const splitLine = line.split(/\s+/);
  if (isNaN(parseInt(splitLine[0]))) {
    return false;
  } else {
    const rejoinedItem = splitLine.slice(1, splitLine.length).join(' ');

    // NOTICE THE ! in front of _.includes(...) 
    // => if line starts with a number but is not found in menuItems then assume that
    //    means it's an item info line.
    //    item info lines (from inspection of physical dockets) start with a number '1'
    return !_.includes(mc.menuItems, rejoinedItem);
  }
}

function tokenIIS (line) {
  console.log('IIS');
  // IIS: "Item Info Separator",
  // a line that looks like "  --------------", which gets sanitized to '-------------'
  return isLineAllDashes(line);
}

function isLineAllDashes (line) {
  const lineChars = _.uniq(line);
  if (lineChars.length === 1 && lineChars[0] === '-') {
    return true;
  } else {
    return false;
  }
}

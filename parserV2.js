// TODO: write out what each token means in reference to a docket.

const colors = require('colors');
const _ = require('lodash');
const npos = require('npos');
const nposParser = npos.parser();
const mc = require('./menuConstants');
const async = require('async');

/*
TOKENS DEFINITION
  VL = Venue Location
  MD = Meta Data  e.g. table num, booking name, covers, "PRINT A/C..."
  CN = Course Name
  MI = Menu Item
  II = Item Info
  IIS = Item Info Separator  => which is '  -------------'
  RC = Random Content
*/
const docketTokens = ['VL','MD','CN','MI','II','IIS','RC'];

exports.parseSingleOrder = parseSingleOrder;

function parseSingleOrder(buffer) {
  nposParser.parse(buffer)
    .then(ast => {
      npos.textualize(ast)
        .then(results => {
          //do somethine with the array of strings
          let data = sanitize(results);
          const zippedData = tokenizeData(data);
          console.log(colors.blue(zippedData));
          buildOrder(zippedData);
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
    // console.log(colors.blue(line));

    if (idx == 0 && tokenVL(line)) {
      // at start of docket
      return _.concat(acc, ["VL"]);
    } else if (idx > 0 && idx < 4) {
      // every docket is guarenteed to have at least 3 lines of meta data
      // 1. device used to take order
      // 2. staff member who took order
      // 3. time order was taken
      return _.concat(acc, ["MD"]);
    } else {
      // everything else is assumed to be variable.
      // that is it may or may not be present on docket
      // (yes, even table number is not present sometimes)
      
      const tokenFuncs = [
        {f: tokenMD, token: "MD", outcome: false},
        {f: tokenCN, token: "CN", outcome: false},
        {f: tokenMI, token: "MI", outcome: false},
        {f: tokenII, token: "II", outcome: false},
        {f: tokenIIS, token: "IIS", outcome: false}
      ];

      const tokenSearch = _.map(tokenFuncs, val => {
        val.outcome = val.f(line);
        return val;
      });


      const truthToken = _.filter(tokenFuncs, val => {
        return val.outcome;
      });
      // console.log('tokenSearch: ', tokenSearch);
      // console.log('truthToken: ',truthToken);

      // IMPORTANT: HOW RANDOM CONTENT IS HANDLED 
      //
      // if NO tokens were found for the current line then truthToken will be an empty
      // array. we need to check for this, and if it's empty we arbitrarily assign that
      // line with a Random Content token, "RC".
      // otherwise, the token we want will be the first (& only) element in truthToken
      if (_.isEmpty(truthToken)) {
        return _.concat(acc, ["RC"]);
      } else {
        return _.concat(acc, [truthToken[0].token]);
      }
    }
  }, []);

  const idxs = _.map(Array(data.length), (val, idx) => {return idx});
  return _.zipWith(data, tokenizedData, idxs, (l, t, i) => {
    return {line:l, token:t, index:i};
  });
}

function tokenVL (line) {
  // VL:  "Venue Location",
  return _.includes(mc.docketStartFields, line);
}

function tokenMD (line) {
  // MD:  "Meta Data",
  return _.some(mc.metaContentKeys, val => {
    return line.includes(val);
  });
}

function tokenCN (line) {
  // CN:  "Course Name",
  return _.some(mc.courseFields, val => {
    return val === line;
  });
}

function tokenMI (line) {
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

function buildOrder(data) {
  let location = _.find(data, val => {
    return val.token === 'VL';
  });
  location = location ? location.line : 'NO LOCATION';
  // console.log(location);

  let metaData = _.filter(data, val => {
    return val.token === 'MD';
  });
  metaData = _.map(metaData, val => {
    return val.line;
  });
  // console.log(metaData);

  let courses = _.filter(data, val => {
    return val.token === 'CN';
  });
  // console.log(courses);

  let itemInfos = _.filter(data, val => {
    return val.token === 'II';
  });
  // console.log(itemInfos);

  let itemInfoSeparators = _.filter(data, val => {
    return val.token === 'IIS';
  });
  // console.log(itemInfoSeparators);

  //TODO: make an object with tokens as keys with their indices locations as vals
  const blah = _.map(docketTokens, token => {
    return _.reduce(data, (acc, val) => {
      if (val.token === token) {
        return acc[token] ? acc[token].push(val.index) : [val.index];
      } else {
        return acc;
      }
    }, {});
  });
  console.log(blah);
}

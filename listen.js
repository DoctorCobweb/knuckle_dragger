const globalConfig = require('./global-config');
const SERIAL_PORT = globalConfig['SERIAL_PORT'];
const MAX_BUFFER_SIZE = globalConfig['SERIAL_PORT'];
const ESCPOS_DATA_LOG = globalConfig['ESCPOS_DATA_LOG'];
const ESCPOS_SINGLE_ORDER = globalConfig['ESCPOS_SINGLE_ORDER'];
const SerialPort = require('serialport');
const fs = require('fs');
const parser = require('./parser');
const colors = require('colors');
const port = new SerialPort(SERIAL_PORT);
var myBuffer = Buffer.alloc(0);

// ESC/POS op code for 'select cut mode and cut paper'
// ASCII GS V m=0 => make a full cut
// hex   1d 56 00 
// dec   29 86 00
// this will change for different cut options on
// POS systems => need to get a hexdump of their bytes
// to see exactly what escpos op they're using.
//
// this creates a buffer containing [0x1d, 0x56, 0x00]
// TODO: multiply different paper cut ops could be in use.
// for now, assume there's only one. implement full case later
const PAPER_CUT_OP_BUFFER = Buffer.from([29,86,00])  

port.on('error', function (err) {
  console.log('ERROR: serialport error: ', err.message);
});

port.on('open', function (err) {
  if (err) {
    console.log('ERROR: opening port: ', err.message);
  }
  console.log('SUCCESS: opened port to device ', SERIAL_PORT);
});

port.on('close', function (err) {
  if (err) {
    console.log('ERROR: on closing port: ', err.message);
  }
  console.log('SUCCESS: closed the port: ', SERIAL_PORT);
});

// switches the port into 'flowing mode'
port.on('data', function (data) {
  myBuffer = Buffer.concat([myBuffer, data])

  if (myBuffer.length >= MAX_BUFFER_SIZE) {
    //prepare to save buffer to file, but first check to see if
    //it contains the paper cut operator. if it does, just save
    //the order and keep and remaining bytes after it.
    //otherwise, save the whole buffer and upon successful save,
    //reset it.
    console.log('hit/exceeded MAX_BUFFER_SIZE => checking for cut op'.red);

    if (checkForCutOperator()) {
      handleOrderInBuffer();
    } else {
      // reached max buffer size but have no paper cut operator.
      // => save to file and reset buffer to blank
      // since we dont have a cut operation.
      //keep adding bytes to our single order file
      const info = 'REACHED MAX BUFFER: no cut op present...saving buffer then reset it';
      console.log(info.red);
      const start = 0;
      const end = myBuffer.length;
      saveBufferToFile(start, end, haveCutOp=false);
      resetBufferToZero();
    } 
  } else {
    if (checkForCutOperator()) {
      handleOrderInBuffer();
    } else {
      //noop: let 'data' events keep adding more data to myBuffer
    }
  }
});

function resetBufferToZero() {
  myBuffer = Buffer.alloc(0);
}

function getASliceOfBuffer(start, end) {
  return myBuffer.slice(start,end);
}

function handleOrderInBuffer() {
  cutLocation = myBuffer.indexOf(PAPER_CUT_OP_BUFFER);

  // this tripped me up: the cutLocation is 1 element of the
  // length of the PAPER_CUT_OP_BUFFER => must subtract 1 to
  // get correct location of op_endpt.
  const _haveCutOp = true;
  const opEndpt = cutLocation + (PAPER_CUT_OP_BUFFER.length - 1);
  const start = 0;
  const end = opEndpt + 1;
  saveBufferToFile(start, end, haveCutOp=_haveCutOp);

  console.log('FOUND A PAPER CUT OP...'.green);
  console.log('cutLocation: ',
    cutLocation,
    'opEndpt: ',
    opEndpt,
    ' myBuffer.length: ',
    myBuffer.length);

  //CAREFUL: we may have the next order already in myBuffer => keep its bytes!
  if (myBuffer.length > opEndpt) {
    console.log('CAREFUL: have bytes from next order already in buffer. keep them'.red);
    const start = opEndpt + 1;
    const end = myBuffer.length;
    myBuffer = getASliceOfBuffer(start, end);
  } else {
    // no extra bytes. should be safe to reset buff to blank
    resetBufferToZero();
  }
}

function checkForCutOperator() {
  if ( myBuffer.includes(PAPER_CUT_OP_BUFFER) ) {
    return true;
  } else {
    return false
  }
}

function saveBufferToFile (start, end, haveCutOp=false) {
  var buff = getASliceOfBuffer(start,end);
  if (haveCutOp) {
    try {
      console.log('haveCutOp: ',
        haveCutOp,
        ', appending the bytes from START= ',
        start,
        ' to END= ',
        ' (up and including the cut op), to file: ',
        ESCPOS_SINGLE_ORDER);

      //TODO: use async waterfall for make this all async

      //append buff contents to the running single order
      //afterwhich the order should be complete
      fs.appendFileSync(ESCPOS_SINGLE_ORDER, buff);

      //read in the completed single order
      var singleOrder = fs.readFileSync(ESCPOS_SINGLE_ORDER);
     
      // write the completed order to the data log
      fs.appendFileSync(ESCPOS_DATA_LOG, singleOrder);


      //the complete singel order is now written to file.
      //=> go off and parse it and then write to local db


      // TODO: data-mungle further and add to rethinkdb
      //parse the completed single order
      //orderParser is async so returns 'undefined' immediately ?!
      var parsedOrder = parser.parseOrder(ESCPOS_SINGLE_ORDER);
      
      // WANT
      // 1. parse the order: escpos binary data to order/JSON
      // 2. saved parsed order to rethink db collection



      console.log('SINGLE ORDER'.cyan);
      console.log(colors.cyan(parsedOrder)); // always 'undefined'

      //clear single file for it to be ready for next stream of bytes from escpos
      fs.truncateSync(ESCPOS_SINGLE_ORDER);
    } catch (e) {
      console.log('haveCutOp: ', 
        haveCutOp,
        ', ERROR appending buff to a file',
        e.message);
    }
  } else {
    try {
      //single order is still not complete. append it to single file
      console.log('haveCutOp: ',
        haveCutOp,
        ', appending entire buffer to single order file');
      fs.appendFileSync(ESCPOS_SINGLE_ORDER, buff);
    } catch (e) {
      console.log('haveCutOp: ', 
        haveCutOp,
        ', ERROR appending buff to a file',
        e.message);
    }
  }
}

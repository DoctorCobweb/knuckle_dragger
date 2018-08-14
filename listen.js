const SERIAL_PORT = '/dev/tty.usbserial'
const SerialPort = require('serialport');
const fs = require('fs');
// const path = require('path');      
const parser = require('./parser');
const colors = require('colors');

const port = new SerialPort(SERIAL_PORT);
var ESCPOS_DATA_LOG = 'escpos-data-log.bin';
var ESCPOS_SINGLE_ORDER = 'escpos-single-order.bin'
var myBuffer = Buffer.alloc(0);
MAX_BUFFER_SIZE = 2048;

// ESC/POS op code for 'select cut mode and cut paper'
// ASCII GS V m=0 => make a full cut
// hex   1d 56 00 
// dec   29 86 00
// this will change for different cut options on
// POS systems => need to get a hexdump of their bytes
// to see exactly what escpos op they're using.
//
// this creates a buffer containing [0x1d, 0x56, 0x00]
const PAPER_CUT_OP_BUFFER = Buffer.from([29,86,00])  

port.on('error', function (err) {
    console.log('ERROR: ', err.message);
});

port.on('open', function (err) {
    if (err) {
        console.log('OPENING ERROR: ', err.message);
    }
});

port.on('close', function (err) {
    if (err) {
        console.log('CLOSING ERROR: ', err.message);
    }
    console.log('closed the port: ', SERIAL_PORT);
});

// switches the port into 'flowing mode'
port.on('data', function (data) {
    //console.log('DATA: ', data);
    //console.log('DATA: ', data.toString('utf8'));
    //console.log(myBuffer);
    // console.log('myBuffer.length: ', myBuffer.length);

    myBuffer = Buffer.concat([myBuffer, data])


    if (myBuffer.length >= MAX_BUFFER_SIZE) {
        //prepare to save buffer to file, but first check to see if
        //it contains the paper cut operator. if it does, just save
        //the order and keep and remaining bytes after it.
        //otherwise, save the whole buffer and upon successful save,
        //reset it.
        console.log('hit/exceeded MAX_BUFFER_SIZE => checking for cut op'.red);

        if (checkForCutOperator(myBuffer)) {
            cut_location = myBuffer.indexOf(PAPER_CUT_OP_BUFFER);

            // this tripped me up: the cut_location is 1 element of the
            // length of the PAPER_CUT_OP_BUFFER => must subtract 1 to
            // get correct location of op_endpt.
            const op_endpt = cut_location + (PAPER_CUT_OP_BUFFER.length - 1);

            //we have a cut operation, flip the orderFinish flag to true
            saveBufferToFile(myBuffer.slice(0, op_endpt + 1), orderFinish=true);

            console.log('found a paper cut op...'.green);
            console.log('cut_location: '
                        , cut_location
                        , 'op_endpt: '
                        , op_endpt
                        , ' myBuffer.length: '
                        , myBuffer.length)

            if (checkForExtraBytes(myBuffer, op_endpt)) {
                // keep the extra bytes
                // var tempBuffer = Buffer.alloc(0);
                // myBuffer.copy(tempBuffer, op_endpt, myBuffer.length)
                // myBuffer = Buffer.alloc(0);
                // myBuffer = tempBuffer;
                myBuffer = myBuffer.slice(op_endpt + 1, myBuffer.length);
            } else {
                // no extra bytes. should be safe to reset buff to blank
                myBuffer = Buffer.alloc(0);
            }
        } else {
            // max buffer size reached, no paper cut operator.
            // => save to file and reset buffer to blank
            // since we dont have a cut operation.
            //keep adding bytes to our single order file
            console.log('no cut op found. saving entire buffer, then resetting it');
            saveBufferToFile(myBuffer, orderFinish=false);
            myBuffer = Buffer.alloc(0);
        } 
    } else {
      if (checkForCutOperator(myBuffer)) {
          testaFunc();
      } else {
          //noop
      }
    }
});

function testaFunc () {
    cut_location = myBuffer.indexOf(PAPER_CUT_OP_BUFFER);

    // this tripped me up: the cut_location is 1 element of the
    // length of the PAPER_CUT_OP_BUFFER => must subtract 1 to
    // get correct location of op_endpt.
    const op_endpt = cut_location + (PAPER_CUT_OP_BUFFER.length - 1);

    //we have a cut operation, flip the orderFinish flag to true
    saveBufferToFile(myBuffer.slice(0, op_endpt + 1), orderFinish=true);

    console.log('found a paper cut op...'.green);
    console.log('cut_location: '
                , cut_location
                , 'op_endpt: '
                , op_endpt
                , ' myBuffer.length: '
                , myBuffer.length)

    if (checkForExtraBytes(myBuffer, op_endpt)) {
        // keep the extra bytes
        // var tempBuffer = Buffer.alloc(0);
        // myBuffer.copy(tempBuffer, op_endpt, myBuffer.length)
        // myBuffer = Buffer.alloc(0);
        // myBuffer = tempBuffer;
        myBuffer = myBuffer.slice(op_endpt + 1, myBuffer.length);
    } else {
        // no extra bytes. should be safe to reset buff to blank
        myBuffer = Buffer.alloc(0);
    }
}


function checkForExtraBytes(buff, op_endpt) {
    //may have additional bytes on end after op_endpt from a new order.
    // => if so don't thow them away! make these bytes the start of next order.
    if (buff.length > op_endpt) {
        console.log('myBuffer contains extra bytes from new order, after cut op'.cyan);
        console.log('...not throwing them away => add to start of new buffer!'.cyan)
        return true;
    } else {
        //no extra bytes after op_endpt
        return false;
    }
}

function checkForCutOperator(buff) {
    if ( buff.includes(PAPER_CUT_OP_BUFFER) ) {
        return true;
    } else {
        return false
    }
}

function saveBufferToFile (buff, orderFinish=false) {
    if (orderFinish) {
        try {
            console.log(orderFinish, 'have a cut op. getting to work with single order');

            //append buff contents to the running single order
            //afterwhich the order should be complete
            fs.appendFileSync(ESCPOS_SINGLE_ORDER, buff);

            //read in the completed single order
            var singleOrder = fs.readFileSync(ESCPOS_SINGLE_ORDER);
           
            // write the completed order to the data log
            fs.appendFileSync(ESCPOS_DATA_LOG, singleOrder);

            // TODO: data-mungle further and add to rethinkdb
            //parse the completed single order
            //orderParser is async so returns 'undefined' immediately ?!
            var parsedOrder = parser.orderParser(ESCPOS_SINGLE_ORDER);
            console.log('SINGLE ORDER'.cyan);
            console.log(colors.cyan(parsedOrder)); // always 'undefined'

            //clear single file for it to be ready for next stream of bytes from escpos
            fs.truncateSync(ESCPOS_SINGLE_ORDER);
        } catch (e) {
            console.log('orderFinish true. ERROR appending buff to file', e.message);
        }
    } else {
        try {
            console.log(orderFinish, 'appending data to single order file');
            //single order is still not complete. append it to single file
            fs.appendFileSync(ESCPOS_SINGLE_ORDER, buff);
        } catch (e) {
            console.log('orderFinish false. ERROR appending buff file',e.message);
        }
    }
}

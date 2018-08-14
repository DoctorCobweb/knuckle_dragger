const SERIAL_PORT = '/dev/tty.usbserial'
const SerialPort = require('serialport');
const fs = require('fs');
// const orderParser = require('./parser');
const colors = require('colors');

const port = new SerialPort(SERIAL_PORT);
var ESCPOS_DATA_FILENAME = 'escpos-data.bin';
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
// console.log('paper cut op length: ', PAPER_CUT_OP_BUFFER.length);

port.on('error', function (err) {
    console.log('ERROR: ', err.message);
});

port.on('open', function (err) {
    if (err) {
        console.log('OPENING ERROR: ', err.message);
    }
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
            saveBufferToFile(myBuffer.slice(0, op_endpt + 1));

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
            console.log('no cut op found. saving entire buffer, then resetting it');
            saveBufferToFile(myBuffer);
            myBuffer = Buffer.alloc(0);
        } 
    } else {
      // saveBufferToFile(data);
    }
});


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

function saveBufferToFile (buff) {
    try {
        console.log('=> writing buffer to file:', ESCPOS_DATA_FILENAME);
        fs.appendFileSync(ESCPOS_DATA_FILENAME, buff);
        console.log('SUCCESSFULLY wrote buff to file');
    } catch (e) {
        console.log('ERROR appending buff to ',
                     ESCPOS_DATA_FILENAME,
                     e.message);
    }
}

port.on('close', function (err) {
    if (err) {
        console.log('CLOSING ERROR: ', err.message);
    }
    console.log('closed the port: ', SERIAL_PORT);
});

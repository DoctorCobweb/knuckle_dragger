const SERIAL_PORT = '/dev/tty.usbserial'
const SerialPort = require('serialport');
const fs = require('fs');
const orderParser = require('./parser');
const colors = require('colors');

const port = new SerialPort(SERIAL_PORT);
var ESCPOS_DATA_FILENAME = 'escpos-data.bin';
var myBuffer = Buffer.alloc(0);
MAX_BUFFER_SIZE = 10192;

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

// switches the port into 'flowing mode'
port.on('data', function (data) {
    //console.log('DATA: ', data);
    //console.log('DATA: ', data.toString('utf8'));
    //console.log('myBuffer.length: ', myBuffer.length);
    //console.log(myBuffer);

    myBuffer = Buffer.concat([myBuffer, data])

    if ( myBuffer.includes(PAPER_CUT_OP_BUFFER) ) {
        cut_location = myBuffer.indexOf(PAPER_CUT_OP_BUFFER);
        console.log('found a paper cut op...'.green);
        console.log('cut_location: '
                    , cut_location
                    , ' myBuffer.length: '
                    , myBuffer.length
        )

        const op_endpt = cut_location + PAPER_CUT_OP_BUFFER.length + 1;

        saveBufferToFile(myBuffer.slice(0, op_endpt));

        if (myBuffer.length > op_endpt) {
            //have additional bytes on end from a new order.
            // => don't thrwo them away !
            console.log('WARNING:'.red);
            console.log('myBuffer contains extra bytes from new order, after cut op'.red);
            console.log('...not throwing them away => add to start of new buffer!'.red)
            myBuffer = myBuffer.slice(op_endpt + 1, myBuffer.length);
        } else {
            resetMyBuffer();
        }
      
    }
    
    if (myBuffer.length >= MAX_BUFFER_SIZE) {
         // TODO
        //saveBufferToFile ();
        console.log('TODO: hit or exceeded MAX_BUFFER_SIZE => need to implement a save')
    }
});

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

function resetMyBuffer () {
    myBuffer = Buffer.alloc(0);
}


port.on('close', function (err) {
    if (err) {
        console.log('CLOSING ERROR: ', err.message);
    }
    console.log('closed the port: ', SERIAL_PORT);
});

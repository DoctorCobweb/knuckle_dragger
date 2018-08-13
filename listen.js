const SERIAL_PORT = '/dev/tty.usbserial'
const SerialPort = require('serialport');
const fs = require('fs');

const port = new SerialPort(SERIAL_PORT);
var ESCPOS_DATA_FILENAME = './escpos-data.bin';


port.on('error', function (err) {
    console.log('ERROR: ', err.message);
});

port.on('open', function (err) {
    if (err) {
        console.log('OPENING ERROR: ', err.message);
    }
});

port.on('data', function (data) {
    console.log('DATA: ', data.toString('utf8'));
    try {
        fs.appendFileSync(ESCPOS_DATA_FILENAME, data);
        console.log('SUCCESS: appended data to ', ESCPOS_DATA_FILENAME);
    } catch (e) {
        console.log('ERROR appending data to ', ESCPOS_DATA_FILENAME);
        
    }
});

port.on('close', function (err) {
    if (err) {
        console.log('CLOSING ERROR: ', err.message);
    }
    console.log('closed the port: ', SERIAL_PORT);
});

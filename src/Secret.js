'use strict';

const fs = require('fs');
const argv = require('yargs').argv;
const crypto = require('crypto');

const path = __dirname + '/.secret';

let secret = null;

if(fs.existsSync(path)){
    secret = fs.readFileSync(path, 'utf8');
}
if(secret === null){
    secret = crypto.randomBytes(128).toString('hex');
    fs.writeFileSync(path, secret, 'utf8');
}
if(argv.logSecret !== undefined){
    return console.log(secret);
}

module.exports = secret;

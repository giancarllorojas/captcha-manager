'use strict';

const fs = require('fs');
const crypto = require('crypto');

const path = __dirname + '/.secret';

if(fs.existsSync(path)){
    return module.exports = fs.readFileSync(path, 'utf8');
}
const secret = crypto.randomBytes(128).toString('hex');
fs.writeFileSync(path, secret, 'utf8');
module.exports = secret;

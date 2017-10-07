"use strict";

const fs = require('fs');
const crypto = require('crypto');

if(fs.existsSync('src/.secret')){
	return module.exports = fs.readFileSync('src/.secret', 'utf8');
}
const secret = crypto.randomBytes(128).toString('hex');
fs.writeFileSync('src/.secret', secret, 'utf8');
module.exports = secret;

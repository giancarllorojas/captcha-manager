"use strict";

const Harvester = require('./src/Harvester');
const Client = require('./src/Client');
const Secret = require('./src/Secret');

const harvester = new Harvester(8081, 8082);

async function run(){
    console.log('google.com: ' + await harvester.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-'));
}
async function run2(){
    console.log('adidas.co.uk: ' + await harvester.getResponse('adidas.co.uk', '6LdC0iQUAAAAAOYmRv34KSLDe-7DmQrUSYJH8eB_'));
}
run();
run2();

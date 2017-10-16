"use strict";

// debug is on so additional information will be shown in the console

const Harvester = require('../src/Harvester');
const Client = require('../src/Client');
const Secret = require('../src/Secret');

const remoteServerPort = 8083;

new Harvester(8081, 8082, remoteServerPort, true, true);
const client = new Client('127.0.0.1', remoteServerPort, Secret, true);

// preferred method: using async/await
async function run(){
    const response = await client.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-');
    console.log('using async/await\n' + response + '\n\n');
}
run();

// or you can do it with Promises
client.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-').then(response => console.log('using Promises\n' + response));

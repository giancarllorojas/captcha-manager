"use strict";

// debug is on so additional information will be shown in the console

const Harvester = require('../src/Harvester');

const harvester = new Harvester(8081, 8082, false, true, true);

// preferred method: using async/await

async function run(){
    const response = await harvester.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-');
    console.log('using async/await\n' + response + '\n\n');
}
run();

// or you can do it with Promises

console.log('using Promises');
harvester.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-').then(response => console.log('using Promises\n' + response));

"use strict";

// debug is on so additional information will be shown in the console

const Harvester = require('../src/Harvester');

const harvester = new Harvester();

// preferred method: using async/await
async function run(){
    const response = await harvester.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-');
    console.log('google.com: ' + response);
}
async function run2(){
    const response = await harvester.getResponse('adidas.com', '6LdC0iQUAAAAAOYmRv34KSLDe-7DmQrUSYJH8eB_');
    console.log('adidas.com: ' + response);
}
async function run3(){
    const response = await harvester.getResponse('supremenewyork.com', '6LeWwRkUAAAAAOBsau7KpuC9AV-6J8mhw4AjC3Xz');
    console.log('supremenewyork.com: ' + response);
}
for(let i = 0; i < 2; i++){
    run();
    run2();
    run3();
}

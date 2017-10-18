'use strict';

const net = require('net');

const Event = require('./Constants').Event;

module.exports = class Client{
    /**
     * @param {String} address
     * @param {Number} port
     * @param {String} secret
     * @param {Boolean|undefined} debug
     */
    constructor(address, port, secret, debug = undefined){
        this.debug = debug;

        this.captchaCallbackIndex = 0;
        this.captchaCallbacks = {};
        this.authenticated = false;
        this.sendQueue = [];
        this.socket = net.createConnection(port, address, ()=>{
            this._send(Event.TCP.ClientAuthenticateEvent, {
                secret: secret
            }, true);
        });
        const onEvent = (event, data)=>{
            switch(event){
                case Event.TCP.ClientAuthenticatedEvent:
                    if(debug){
                        console.log('Authentication response: ' + data.message);
                    }
                    this.authenticated = data.authenticated;
                    if(data.authenticated){
                        for(let i = 0; i < this.sendQueue.length; i++){
                            const message = this.sendQueue[i];
                            this._send(message.event, message.data);
                        }
                    }
                    break;
                case Event.TCP.CaptchaResponseEvent:
                    this.captchaCallbacks[data.captchaCallbackIndex](data.response);
                    break;
            }
        };
        const endIdentifier = '\n\r\n\r';
        let buffers = [];
        this.socket.on('data', (buffer)=>{
            buffers.push(buffer);
            let bufferString = Buffer.concat(buffers).toString();
            let endIndex = bufferString.indexOf(endIdentifier);
            do{
                const jsonString = bufferString.slice(0, endIndex);
                try{
                    const json = JSON.parse(jsonString);
                    onEvent(json.event, json.data);
                }catch(error){
                    console.log('Could not parse JSON from TCP server: ' + error.message);
                }
                const newString = bufferString.slice(endIndex + endIdentifier.length);
                buffers = [new Buffer(newString)];
                endIndex = newString.indexOf(endIdentifier);
                bufferString = newString;
            }while(endIndex > 0);
        });
    }
    /**
     * Send data to the TCP server
     * @param {String} event
     * @param {Object} data
     * @param {Boolean|undefined} isAuthData
     * @private
     */
    _send(event, data, isAuthData = undefined){
        if(this.authenticated || isAuthData){
            this.socket.write(JSON.stringify({event: event, data: data}) + '\n\r\n\r');
        }else{
            this.sendQueue.push({event: event, data: data});
        }
    }
    /**
     * Get the g-recaptcha-response from a captcha
     * @param {String} host
     * @param {String} siteKey
     * @param {Boolean|undefined} prioritise
     * @returns {Promise}
     */
    getResponse(host, siteKey, prioritise = false){
        this._send(Event.TCP.CaptchaRequestEvent, {
            captchaCallbackIndex: this.captchaCallbackIndex,
            host: host,
            siteKey: siteKey,
            prioritise: prioritise
        });
        return new Promise((resolve) =>{
            this.captchaCallbacks[this.captchaCallbackIndex++] = resolve;
        });
    }
    /**
     * Stop the Client
     */
    stop(){
        this.socket.destroy();
    }
};

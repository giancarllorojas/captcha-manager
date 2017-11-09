'use strict';

const opn = require('opn');
const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const net = require('net');
const Secret = require('./Secret');
const Constants = require('./Constants');

const Event = Constants.Event;

module.exports = class Harvester{
    /**
     * Initialise CaptchaHarvester (start HTTP server)
     * @param {Number|undefined} httpPort
     * @param {Number|undefined} webSocketPort
     * @param {Boolean|undefined} remoteServerPort
     * @param {Boolean|undefined} openBrowser
     * @param {Boolean|undefined} debug
     */
    constructor(httpPort = 8081, webSocketPort = 8082, remoteServerPort = undefined, openBrowser = true, debug = false){
        this.debug = debug;

        this.httpPort = httpPort;
        this.captchaCallbacks = {};
        this.captchaCallbackIndex = 0;

        this.webSocketServer = null;
        this.webSocketClients = [];
        this.sendQueue = [];

        this.tcpServer = null;
        this.tcpSocketClients = [];

        this.openBrowser = openBrowser;
        this.firstCaptchaRequested = false;

        const app = express();
        app.use(express.static(__dirname + '/../html'));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        app.get('/captcha/:captchaCallbackIndex/:siteKey',
            (request, response) =>{
                const {captchaCallbackIndex, siteKey} = request.params;
                response.send('' +
                    '<html>' +
                    '   <head>' +
                    '       <title>reCAPTCHA</title>' +
                    '       <script src="https://www.google.com/recaptcha/api.js" async defer></script>' +
                    '   </head>' +
                    '   <body>' +
                    '       <form action="/captcha" method="POST">' +
                    '       <input type="hidden" name="captchaCallbackIndex" value="' + captchaCallbackIndex + '" />' +
                    '       <div class="g-recaptcha" data-sitekey="' + siteKey + '">' +
                    '       </div>' +
                    '       <br/>' +
                    '       <input type="submit" value="Submit">' +
                    '       </form>' +
                    '   </body>' +
                    '</html>'
                );
            });
        app.post('/captcha', (request, response) =>{
            const captchaCallbackIndex = parseInt(request.body['captchaCallbackIndex']);
            const captchaCallback = this.captchaCallbacks[captchaCallbackIndex];
            captchaCallback(request.body['g-recaptcha-response']);
            delete this.captchaCallbacks[captchaCallbackIndex];
            response.end();
            this._sendWebSocketClients(Event.WebSocket.RemoveCaptchaEvent, {
                captchaCallbackIndex: captchaCallbackIndex
            });
        });
        app.listen(httpPort);

        if(Number.isInteger(remoteServerPort)){
            this.tcpServer = net.createServer((socket)=>{
                socket.authenticated = false;
                socket.key = socket.remoteAddress + ':' + socket.remotePort;
                socket.id = this.tcpSocketClients.length;
                this.tcpSocketClients.push(socket);
                if(debug){
                    console.log(socket.key + ' has connected to the TCP server');
                }
                setTimeout(()=>{
                    if(!socket.authenticated){
                        this._sendSocket(socket, Event.TCP.ClientAuthenticatedEvent, {
                            authenticated: false,
                            message: 'Not authenticated in time'
                        });
                        this.tcpSocketClients.splice(socket.id, 1);
                    }
                }, 3000);
                const onEvent = async(event, data)=>{
                    switch(event){
                        case Event.TCP.ClientAuthenticateEvent:
                            if(data.secret === Secret){
                                socket.authenticated = true;
                                this._sendSocket(socket, Event.TCP.ClientAuthenticatedEvent, {
                                    authenticated: true,
                                    message: 'Successfully authenticated'
                                });
                            }else{
                                this._sendSocket(socket, Event.TCP.ClientAuthenticatedEvent, {
                                    authenticated: false,
                                    message: 'Wrong secret'
                                });
                            }
                            break;
                        case Event.TCP.CaptchaRequestEvent:
                            const response = await this.getResponse(data.host, data.siteKey, data.prioritise);
                            this._sendSocket(socket, Event.TCP.CaptchaResponseEvent, {
                                captchaCallbackIndex: data.captchaCallbackIndex,
                                response: response
                            });
                            if(!this.firstCaptchaRequested){
                                if(openBrowser){
                                    opn('http://127.0.0.1:' + httpPort);
                                }
                                this.firstCaptchaRequested = true;
                            }
                            break;
                    }
                };
                const endIdentifier = '\n\r\n\r';
                let buffers = [];
                socket.on('data', (buffer)=>{
                    buffers.push(buffer);
                    let bufferString = Buffer.concat(buffers).toString();
                    let endIndex = bufferString.indexOf(endIdentifier);
                    do{
                        const jsonString = bufferString.slice(0, endIndex);
                        try{
                            const json = JSON.parse(jsonString);
                            onEvent(json.event, json.data);
                        }catch(error){
                            console.log('Could not parse JSON on TCP server: ' + error.message);
                        }
                        const newString = bufferString.slice(endIndex + endIdentifier.length);
                        buffers = [new Buffer(newString)];
                        endIndex = newString.indexOf(endIdentifier);
                        bufferString = newString;
                    }while(endIndex > 0);
                });
            });
            this.tcpServer.listen(remoteServerPort);
        }

        this.webSocketServer = new WebSocket.Server({
            port: webSocketPort
        });
        this.webSocketServer.on('connection', (ws, request)=>{
            if(debug){
                console.log(request.connection.remoteAddress + ' has connected to the Web Socket Server');
            }
            this.webSocketClients.push(ws);
            if(this.webSocketClients.length === 1){ // first client, send queue messages
                for(let i = 0; i < this.sendQueue.length; i++){
                    const message = this.sendQueue[i];
                    this._sendWebSocketClients(message.event, message.data);
                }
            }
        });
        this.webSocketServer.on('message', (data) =>{
            try{
                const json = JSON.parse(data);
                const data = json.data;
                switch(json.event){
                    /*case Event.CaptchaSubmittedEvent:
                        this._sendWebSocketClients(Event.RemoveCaptchaEvent, {
                            captchaCallbackIndex: data.captchaCallbackIndex
                        });
                        break;*/
                }
            }catch(error){
                console.log('Could not parse WebSocket data: ' + error.message);
            }
        });
    }
    /**
     * Broadcast data to all WebSocket clients
     * @param {String} event
     * @param {Object} data
     * @private
     */
    _sendWebSocketClients(event, data){
        if(this.webSocketClients.length === 0){ // add to queue
            this.sendQueue.push({event: event, data: data});
        }else{
            for(let i = 0; i < this.webSocketClients.length; i++){
                this.webSocketClients[i].send(JSON.stringify({
                    event: event,
                    data: data
                }));
            }
        }
    }
    /**
     * Send data to TCP socket client
     * @param {net.Socket} socket
     * @param {String} event
     * @param {Object} data
     * @private
     */
    _sendSocket(socket, event, data){
        socket.write(JSON.stringify({
            event: event,
            data: data
        }) + '\n\r\n\r');
    }
    /**
     * Get the g-recaptcha-response from a captcha
     * @param {String} host
     * @param {String} siteKey
     * @param {Boolean|undefined} prioritise
     * @returns {Promise}
     */
    getResponse(host, siteKey, prioritise = false){
        if(!this.firstCaptchaRequested){
            if(this.openBrowser){
                opn('http://127.0.0.1:' + this.httpPort);
            }
            this.firstCaptchaRequested = true;
        }
        this._sendWebSocketClients(Event.WebSocket.AddCaptchaEvent, {
            captchaCallbackIndex: this.captchaCallbackIndex,
            url: 'http://localapi.' + host + ':' + this.httpPort + '/captcha/' + this.captchaCallbackIndex + '/' + siteKey,
            host: host,
            prioritise: prioritise
        });
        return new Promise((resolve)=>{
            this.captchaCallbacks[this.captchaCallbackIndex++] = resolve;
        });
    }
    /**
     * Set the maximum amount of captchas that can be displayed at once in the browser
     * @param limit
     */
    setBrowserDisplayedCaptchasLimit(limit = 30){
        this._sendWebSocketClients(Event.WebSocket.SetBrowserDisplayedCaptchasLimit, {
            limit: limit
        });
    }
    /**
     * Stop the Harvester
     */
    /*stop(){
        //this.tcpServer.destroy();
    }*/
};

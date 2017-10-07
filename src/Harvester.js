"use strict";

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
	 * @param {Number} httpPort
	 * @param {Number} webSocketPort
	 * @param {Boolean} remoteServerPort
	 * @param {Boolean} openBrowser
	 */
	constructor(httpPort, webSocketPort, remoteServerPort, openBrowser){
		if(httpPort === undefined){
			httpPort = 8081;
		}
		if(webSocketPort === undefined){
			webSocketPort = 8082;
		}
		if(remoteServerPort === undefined || remoteServerPort === false || remoteServerPort === null){
			remoteServerPort = false;
		}else{
			if(!Number.isInteger(remoteServerPort)){
				remoteServerPort = 8083;
			}
		}
		if(openBrowser === undefined){
			openBrowser = true;
		}

		this.httpPort = httpPort;
		this.captchaCallbacks = {};
		this.captchaCallbackIndex = 0;
		this.webSocketClients = [];
		this.tcpSocketClients = [];

		const app = express();
		app.use(express.static('html'));
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({
			extended: true
		}));
		app.get('/captcha/:captchaCallbackIndex/:siteKey', (request, response)=>{
			const {captchaCallbackIndex, siteKey} = request.params;
			response.send('<html><head><title>reCAPTCHA</title><script src="https://www.google.com/recaptcha/api.js" async defer></script></head><body><form action="/captcha" method="POST"><input type="hidden" name="captchaCallbackIndex" value="' + captchaCallbackIndex + '" /><div class="g-recaptcha" data-sitekey="' + siteKey + '"></div><br/><input type="submit" value="Submit"></form></body></html>')
		});
		app.post('/captcha', (request, response)=>{
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
			const server = net.createServer((socket)=>{
				socket.authenticated = false;
				socket.key = socket.remoteAddress + ':' + socket.remotePort;
				socket.id = this.tcpSocketClients.length;
				this.tcpSocketClients.push(socket);
				console.log(socket.key + ' has connected to the TCP server');
				setTimeout(()=>{
					if(!socket.authenticated){
						this._sendSocket(socket, Event.TCP.ClientAuthenticatedEvent, {
							authenticated: false,
							message: "Not authenticated in time"
						});
						this.tcpSocketClients.splice(socket.id, 1);
					}
				}, 3000);
				const onEvent = async (event, data)=>{
					switch(event){
						case Event.TCP.ClientAuthenticateEvent:
							if(data.secret === Secret){
								socket.authenticated = true;
								this._sendSocket(socket, Event.TCP.ClientAuthenticatedEvent, {
									authenticated: true,
									message: "Successfully authenticated"
								});
							}else{
								this._sendSocket(socket, Event.TCP.ClientAuthenticatedEvent, {
									authenticated: false,
									message: "Wrong secret"
								});
							}
							break;
						case Event.TCP.CaptchaRequestEvent:
							const response = await this.getResponse(data.host, data.siteKey, data.prioritise);
							this._sendSocket(socket, Event.TCP.CaptchaResponseEvent, {
								captchaCallbackIndex: data.captchaCallbackIndex,
								response: response
							});
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
			server.listen(remoteServerPort);
		}

		const WebSocketServer = new WebSocket.Server({
			port: webSocketPort
		});
		WebSocketServer.on('connection', (ws, request)=>{
			console.log(request.connection.remoteAddress + ' has connected to the Web Socket Server');
			this.webSocketClients.push(ws);
		});
		WebSocketServer.on('message', (data)=>{
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

		if(openBrowser){
			opn('http://127.0.0.1:' + httpPort);
		}
	}
	/**
	 * Broadcast data to all WebSocket clients
	 * @param {String} event
	 * @param {Object} data
	 * @private
	 */
	_sendWebSocketClients(event, data){
		for(let i = 0; i < this.webSocketClients.length; i++){
			this.webSocketClients[i].send(JSON.stringify({
				event: event,
				data: data
			}));
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
	getResponse(host, siteKey, prioritise){
		if(prioritise === undefined){
			prioritise = false;
		}
		this._sendWebSocketClients(Event.WebSocket.AddCaptchaEvent, {
			captchaCallbackIndex: this.captchaCallbackIndex,
			url: 'http://localapi.' + host + ':' + this.httpPort + '/captcha/' + this.captchaCallbackIndex + '/' + siteKey,
			host: host,
			prioritise
		});
		return new Promise((resolve)=>{
			this.captchaCallbacks[this.captchaCallbackIndex++] = resolve;
		});
	}
};

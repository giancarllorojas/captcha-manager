# captcha-manager
A Node.js module used for creating and harvesting Google ReCAPTCHA response tokens

# Install
1. Change directory to your Node.js project in terminal
2. Run `npm install captcha-manager --save`

# Setup
First of all, you have to edit your hosts file. You'll need to add a new entry for each website you'll be getting captcha tokens from. For example, if you'll be getting tokens from `adidas.com`, you have to add this to your hosts file: `127.0.0.1 localapi.adidas.com`

The respective hosts files on macOS and Windows are `/etc/hosts` and `c:\windows\system32\drivers\etc\hosts`.

# Usage
### Local
Create a Harvester to start getting captcha response tokens.
```
const {Harvester} = require('captcha-manager');

const harvester = new Harvester();
```
You can get a captcha response token by calling the getResponse method:
```
async function run(){
//                                               hostname      sitekey
    const response = await harvester.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-');
    console.log(response);
}
run();
```
This will open your default browser with the captcha(s).

If you want to prioritise getting a certain response token first, just set the third parameter to true. That'll push it to the front of the captchas queue.
```
await harvester.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-');
// -->
await harvester.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-', true);
```
You can also use Promises (however, I would recommend using async & await because it's a lot nicer):
```
harvester.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-').then(response => console.log(response));
```
### Remote

You can also setup a Client, that will get captcha response tokens from a remote Harvester (or "server"). This is useful if, say, you're running a bot on a server somewhere and you want to complete the captchas on your own computer.  

First, you need to run the actual Harvester somewhere so that the client can connect to it. Your Harvester will now act as a server.  
You can do that by cloning this repository and either running the pre-made script by changing directory to the cloned repository and running `node start.js`, or by installing it via npm and creating a Harvester in your own project by doing:  
```
const {Harvester} = require('captcha-manager');

const remoteServerPort = 8083;
//                              HTTP port
const harvester = new Harvester(8081, 8082, remoteServerPort);
//                                    Web Socket Server port
```
Next, you'll have to setup the client. To do that, you'll need the IP address of the computer that's running the Harvester, and the remote server port (which is 8083 if you ran the pre-made `start.js` script, or whatever you used as the remote server port parameter if you did it manually).
You'll also need the secret, which can either get by going to your cloned repository or by going to the `node_modules/captcha-manager` repository of your Node.js project and then running `cat src/.secret`. Your secret will have echo'd in terminal if you've used/ran the module at least once by running `node start.js` and stopping the process afterwards.

Once you have the secret, you can start the Client.  
```
const {Client} = require('captcha-manager');

const ipAddress = 'xx.xx.xx.xx';
const remoteServerPort = 8083;
const secret = '4336a1682f726c17e12c0e902e791b1717e05ba2ef82ec1988a9f3143236d5e7d74177c273c743214a9e64b72bb28fad7909498fa66168d06a5e94ccf47aec64d6f11738267557d7b5cdc8c6e1b6d6b2f7a46c2630af89ab8eb227f097d367366ac5e7a81c1ede165f9b2894a11b2321120ee0ea6c6b5d677a659ca1614b3c58';

const client = new Client(ipAddress, remoteServerPort, secret);
```
The client has the exact same getResponse method as the Harvester, with the only difference being the tokens coming from your "server".  
```
async function run(){
    const response = await harvester.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-');
    console.log(response);
}
run();

// or promises

harvester.getResponse('google.com', '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-').then(response => console.log(response));
```

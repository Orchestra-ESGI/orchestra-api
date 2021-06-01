const PORT = process.env.PORT || 3000;
const BASEAPPURL = process.env.BASEAPPURL || 'http://localhost:3000/';
const BROKERURL = process.env.BROKERURL || "mqtt://192.168.1.33:1883";
const mqtt = require('mqtt');
const clientOpts = {
    username: "pi",
    password: "nassimpi",
    clientId: "API"
}

module.exports = {
    PORT,
    BASEAPPURL,
    BROKERURL,
    mqtt,
    clientOpts
};

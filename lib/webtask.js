"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bodyParser = require("body-parser");
var express = require("express");
var Webtask = require('webtask-tools');
var packet_1 = require("./packet");
var storage_1 = require("./storage");
// init Express context
var app = express();
app.use(bodyParser.json());
// prepare global storage container
var storage = new storage_1.Storage();
// setup routes
app.post('/packet', function (req, res) {
    var packet = req.body;
    // validate the request
    var err = packet_1.validatePacket(packet);
    if (err) {
        return res.status(400).send(err);
    }
    // store the packet
    storage.queuePacket(packet);
    res.sendStatus(200);
});
app.get('/packet', function (req, res) {
    var key = req.body;
    if (typeof key !== 'string') {
        return res.status(400).send('Must provide a valid key');
    }
    // retrieve and send all outstanding packets
    var packets = storage.dequeuePackets(key);
    res.status(200).send(packets);
});
// intercept the context storage for deserializing, as well as serializing + caching at the end
module.exports = (function (ctx, cb) {
    storage.deserialize(ctx, cb);
    Webtask.fromExpress(app)(ctx, cb);
    storage.serialize(ctx, cb);
});
//# sourceMappingURL=webtask.js.map
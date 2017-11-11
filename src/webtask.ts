import * as bodyParser from 'body-parser';
import * as express from 'express';
const Webtask = require('webtask-tools');

import { Packet, validatePacket } from './packet';
import { Storage } from './storage';

// init Express context
const app = express();
app.use(bodyParser.json());

// prepare global storage container
const storage = new Storage();

// setup routes
app.post('/packet', (req, res) => {
    const packet = req.body as Packet;

    // validate the request
    const err = validatePacket(packet);
    if (err) {
        return res.status(400).send(err);
    }

    // store the packet
    storage.queuePacket(packet);

    res.sendStatus(200);
});

app.get('/packet', (req, res) => {
    const key = req.body;
    if (typeof key !== 'string') {
        return res.status(400).send('Must provide a valid key');
    }

    // retrieve and send all outstanding packets
    const packets = storage.dequeuePackets(key);

    res.status(200).send(packets);
});

// intercept the context storage for deserializing, as well as serializing + caching at the end
module.exports = ((ctx: any, cb: any) => {
    storage.deserialize(ctx, cb);

    Webtask.fromExpress(app)(ctx, cb);

    storage.serialize(ctx, cb);
});

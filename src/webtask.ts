import * as bodyParser from 'body-parser';
import * as express from 'express';
const Webtask = require('webtask-tools');

import { Packet, validatePacket } from './packet';
import { Storage } from './storage';

// init express app
const app = express();
app.use(bodyParser.json());

// prepare global storage container
const storage = new Storage();

// setup routes
app.post('/packet', async (req, res) => {
    const packet = req.body as Packet;

    // validate the request
    const err = validatePacket(packet);
    if (err) {
        return res.status(400).send(err);
    }

    // get storage state
    await storage.deserialize((req as any).webtaskContext);

    // store the packet
    storage.queuePacket(packet);

    // set storage state
    await storage.serialize();

    res.sendStatus(200);
});

app.get('/packet/:key', async (req, res) => {
    const key = req.params.key;
    if (typeof key !== 'string') {
        return res.status(400).send('Must provide a valid key');
    }

    // get storage state
    await storage.deserialize((req as any).webtaskContext);

    // retrieve and send all outstanding packets
    const packets = storage.dequeuePackets(key);

    // set storage state
    await storage.serialize();

    res.status(200).send(packets);
});

module.exports = Webtask.fromExpress(app);

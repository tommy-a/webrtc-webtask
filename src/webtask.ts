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

    // store the packet
    storage.context = (req as any).webtaskContext;
    await storage.queue(packet);

    res.sendStatus(200);
});

app.get('/packet/:key', async (req, res) => {
    const key = req.params.key;
    if (typeof key !== 'string') {
        return res.status(400).send('Must provide a valid key');
    }

    // retrieve and send all outstanding packets
    storage.context = (req as any).webtaskContext;
    const packets = await storage.dequeue(key);

    res.status(200).send(packets);
});

// for debugging purposes...
app.delete('/packet', (req, res) => {
    // clear all packets
    storage.context = (req as any).webtaskContext;
    storage.reset();

    res.sendStatus(200);
});

module.exports = Webtask.fromExpress(app);

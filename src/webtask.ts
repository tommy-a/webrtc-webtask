import * as bodyParser from 'body-parser';
import * as express from 'express';
const Webtask = require('webtask-tools');

// init Express context
const app = express();
app.use(bodyParser.json());

// setup routes
app.get('/', (req, res) => {
    res.sendStatus(200);
});

// export instance
module.exports = Webtask.fromExpress(app);

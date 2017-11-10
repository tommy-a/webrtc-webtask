"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bodyParser = require("body-parser");
var express = require("express");
var Webtask = require('webtask-tools');
// init Express context
var app = express();
app.use(bodyParser.json());
// setup routes
app.get('/', function (req, res) {
    res.sendStatus(200);
});
// export instance
module.exports = Webtask.fromExpress(app);
//# sourceMappingURL=webtask.js.map
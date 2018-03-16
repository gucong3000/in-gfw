"use strict";
const os = require("./os");
const mem = require("mem");
const net = mem(require("./net"));
module.exports.os = os.async;
module.exports.osSync = os.sync;
module.exports.net = net;

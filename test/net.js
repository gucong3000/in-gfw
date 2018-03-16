"use strict";

const CI = require("ci-info");
const url = require("url");
const http = require("http");
const inGFW = require("../");
const assert = require("assert");
const isWsl = require("is-wsl");

describe("inGFW.net()", () => {
	let srv;
	let port = 3000;

	const parseUrl = path => "http://127.0.0.1:" + port + "/" + path;
	const result = !(CI.isCI && CI.name);

	it("inGFW.net()", () => {
		return inGFW.net().then(inGFW => {
			assert.equal(inGFW, result);
		});
	});
	it("inGFW.net() whth hostname", () => {
		return inGFW.net("www.google.com", "www.baidu.com").then(inGFW => {
			assert.equal(inGFW, result);
		});
	});
	it("inGFW.net() whth https url", () => {
		return inGFW.net("https://www.google.com", "https://www.baidu.com").then(inGFW => {
			assert.equal(inGFW, result);
		});
	});
	it("inGFW.net() whth http url", () => {
		return inGFW.net("http://www.google.com", "http://www.baidu.com").then(inGFW => {
			assert.equal(inGFW, result);
		});
	});
	it("inGFW.net() whth object", () => {
		return inGFW.net(
			url.parse("https://www.google.com"),
			url.parse("https://www.baidu.com")
		).then(inGFW => {
			assert.equal(inGFW, result);
		});
	});
	it("inGFW.net() error `ENOTFOUND`", cb => {
		inGFW.net(
			"test.notexist",
			"test.notexist"
		).catch(error => {
			assert.equal(error.errno, "ENOTFOUND");
			cb();
		});
	});
	if (isWsl) {
		return;
	}

	before(cb => {
		function listen () {
			srv.listen({
				port,
			}, () => {
				cb();
			});
		}
		srv = http.createServer((req, res) => {
			const time = {
				"blockedHost": 100,
				"cnHost": 0,
			}[req.url.slice(1)] || 0;
			setTimeout(() => {
				res.end();
			}, time);
		});
		srv.on("error", (e) => {
			if (e.code === "EADDRINUSE") {
				port++;
				setTimeout(listen, 300);
			}
		});
		listen();
	});
	after((cb) => {
		srv.close(cb);
	});

	it("in gfw", () => {
		return inGFW.net(
			parseUrl("blockedHost"),
			parseUrl("cnHost")
		).then(inGFW => {
			assert.equal(inGFW, true);
		});
	});

	it("not in gfw", () => {
		return inGFW.net(
			parseUrl("cnHost"),
			parseUrl("blockedHost")
		).then(inGFW => {
			assert.equal(inGFW, false);
		});
	});

	it.skip("ETIMEDOUT", cb => {
		return inGFW.net(
			"google.com",
			"google.com"
		).then(inGFW => {
			assert.equal(inGFW, true);
		});
	});
});

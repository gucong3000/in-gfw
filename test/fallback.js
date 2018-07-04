"use strict";
const assert = require("assert");
const proxyquire = require("proxyquire");
const net = require("../lib/net");
const inGFW = proxyquire("../", {
	"./os": {
		sync: () => {
			throw new Error("mock sync error");
		},
		async: () => Promise.reject(new Error("mock async error")),
	},
});

describe("fallback", () => {
	const result = net.sync();
	it("inGFW()", async () => {
		await inGFW().then(inGFW => {
			assert.equal(inGFW, result);
		});
	});
	it("inGFW.sync()", () => {
		assert.equal(inGFW.sync(), result);
	});
});

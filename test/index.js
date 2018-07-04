"use strict";
const assert = require("assert");
const inGFW = require("../");

describe("in-gfw", () => {
	const result = inGFW.osSync();
	it("inGFW()", async () => {
		await inGFW().then(inGFW => {
			assert.equal(inGFW, result);
		});
	});
	it("inGFW.sync()", () => {
		assert.equal(inGFW.sync(), result);
	});
	it("inGFW.os()", async () => {
		await inGFW.os().then(inGFW => {
			assert.equal(inGFW, result);
		});
	});
	it("inGFW.net()", async () => {
		await inGFW.net().then(inGFW => {
			assert.equal(inGFW, result);
		});
	});
	it("inGFW.net() lazy", async () => {
		const time = new Date();
		await inGFW.net().then(inGFW => {
			assert.ok(new Date() - time < 9);
			assert.equal(inGFW, result);
		});
	});
	it("inGFW.net()", async () => {
		await inGFW.net("google.com", "baidu.com").then(inGFW => {
			assert.equal(inGFW, result);
		});
	});
});

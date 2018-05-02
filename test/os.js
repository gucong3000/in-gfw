"use strict";
const assert = require("assert");
const proxyquire = require("proxyquire");
const osMock = {
	"./geo": {
		async: (callback) => {
			called["async"] = true;
			callback(error, geo);
		},
		sync: (callback) => {
			called["sync"] = true;
			callback(error, geo);
		},
	},
	"./timezone": {
		async: (callback) => {
			called["async"] = true;
			callback(error, timezone);
		},
		sync: (callback) => {
			called["sync"] = true;
			callback(error, timezone);
		},
	},
};

let called;
let error;
let geo;
let timezone;
let os;

describe("os", () => {
	beforeEach(() => {
		delete require.cache[require.resolve("../lib/os")];
		os = proxyquire("../lib/os", osMock);
		timezone = "Asia/Shanghai";
		geo = "45";
		error = null;
		called = {};
	});

	it("in GFW sync", () => {
		assert.ok(os.sync());
	});

	it("in GFW Promise", () => {
		return os.async().then(inGFW => {
			assert.ok(inGFW);
		});
	});

	it("in GFW callback", cb => {
		return os.async((error, inGFW) => {
			try {
				assert.ifError(error);
				assert.ok(inGFW);
				cb();
			} catch (ex) {
				cb(ex);
			}
		});
	});

	it("not in GFW sync", () => {
		timezone = "America/New_York";
		geo = "44";
		assert.equal(os.sync(), false);
	});

	it("not in GFW Promise", () => {
		timezone = "America/New_York";
		geo = "44";
		return os.async().then(inGFW => {
			assert.equal(inGFW, false);
		});
	});

	it("not in GFW callback", cb => {
		timezone = "America/New_York";
		geo = "44";
		return os.async((error, inGFW) => {
			try {
				assert.ifError(error);
				assert.equal(inGFW, false);
				cb();
			} catch (ex) {
				cb(ex);
			}
		});
	});

	it("error sync", () => {
		error = new Error("error_mock");
		assert.throws(() => {
			os.sync();
		}, (error) => {
			return error.message === "error_mock";
		});
	});

	it("error callback", cb => {
		error = new Error("error_mock");
		return os.async((error, inGFW) => {
			try {
				assert.ok(error);
				assert.equal(error.message, "error_mock");
				cb();
			} catch (ex) {
				cb(ex);
			}
		});
	});

	it("error Promise", cb => {
		error = new Error("error_mock");
		os.async().catch(error => {
			try {
				assert.ok(error);
				assert.equal(error.message, "error_mock");
				cb();
			} catch (ex) {
				cb(ex);
			}
		});
	});

	it("lazy", async () => {
		assert.ifError(called["sync"]);
		const result = os.sync();
		assert.ok(called["sync"]);
		called["sync"] = null;
		assert.equal(os.sync(), result);
		assert.ifError(called["sync"]);
		await os.async().then(inGFW => {
			assert.ifError(called["async"]);
			assert.equal(inGFW, result);
		});
		await os.async().then(inGFW => {
			assert.ifError(called["async"]);
			assert.equal(inGFW, result);
		});
	});
});

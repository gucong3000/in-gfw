"use strict";
const assert = require("assert");
const mock = require("mock-fs");
const util = require("util");
const promisify = util.promisify || require("util-promisify");
const fs = require("fs");
const proxyquire = require("proxyquire");
let timezoneAsync;
let timezoneSync;

describe("timezone", () => {
	beforeEach(() => {
		let timezone;
		delete require.cache[require.resolve("../lib/timezone")];
		if (process.platform === "win32") {
			const glob = function (pattern, callback) {
				fs.readdir("/usr/share/zoneinfo/mock/", (error, files) => {
					callback(error, files && files.map(file => "/usr/share/zoneinfo/mock/" + file));
				});
			};
			glob.sync = () => {
				return fs.readdirSync("/usr/share/zoneinfo/mock/").map(file => "/usr/share/zoneinfo/mock/" + file);
			};
			timezone = proxyquire("../lib/timezone", {
				glob,
			});
		} else {
			timezone = require("../lib/timezone");
		}
		timezoneAsync = promisify(timezone.async);
		timezoneSync = promisify(timezone.sync);
	});
	afterEach(() => {
		mock.restore();
	});

	it("timezone with `/etc/timezone`", async () => {
		mock({
			"/etc/timezone": "mock/timezone",
		});
		await timezoneAsync().then(tz => {
			assert.equal(tz, "mock/timezone");
		});
		await timezoneSync().then(tz => {
			assert.equal(tz, "mock/timezone");
		});
	});
	it("timezone with `/etc/localtime`", async () => {
		mock({
			"/etc/localtime": mock.symlink({
				path: "/usr/share/zoneinfo/mock/localtime",
			}),
			"/usr/share/zoneinfo/mock/localtime": mock.symlink({
				path: "../MOCK",
			}),
		});
		await timezoneAsync().then(tz => {
			assert.equal(tz, "MOCK");
		});
		await timezoneSync().then(tz => {
			assert.equal(tz, "MOCK");
		});
	});
	it("timezone with `findLocaltime()`", async () => {
		const tzfs = {};
		for (let i = 1; i < 9; i++) {
			let file = String(i);
			tzfs[file] = file;
			file = file.repeat(i);
			tzfs[file] = file;
		}
		mock({
			"/etc/localtime": "7",
			"/usr/share/zoneinfo/mock": tzfs,
		});
		await timezoneAsync().then(tz => {
			assert.equal(tz, "mock/7");
		});
		await timezoneSync().then(tz => {
			assert.equal(tz, "mock/7");
		});
	});

	it("cannot determine this system's timezone", cb => {
		const tzfs = {};
		for (let i = 1; i < 9; i++) {
			const file = String(i);
			tzfs[file] = file;
		}
		mock({
			"/etc/localtime": "mock",
			"/usr/share/zoneinfo/mock": tzfs,
		});
		timezoneAsync((error, result) => {
			try {
				assert.ok(error);
				assert.equal(error.message, "cannot determine this system's timezone");
				assert.ifError(result);
				cb();
			} catch (ex) {
				cb(ex);
			}
		});
	});

	it("no such file or directory '/etc/localtime'", cb => {
		mock();
		timezoneAsync((error, result) => {
			try {
				assert.ok(error);
				assert.ok(/[/\\]localtime'/.test(error.message));
				assert.equal(error.code, "ENOENT");
				assert.ifError(result);
				cb();
			} catch (ex) {
				cb(ex);
			}
		});
	});

	if (process.platform === "win32") {
		it("no such file or directory '/usr/share/zoneinfo/mock'", cb => {
			mock({
				"/etc/localtime": "mock",
			});
			timezoneAsync((error, result) => {
				try {
					assert.ok(error);
					assert.ok(/zoneinfo\\mock'/.test(error.message));
					assert.equal(error.code, "ENOENT");
					assert.ifError(result);
					cb();
				} catch (ex) {
					cb(ex);
				}
			});
		});
	}
});

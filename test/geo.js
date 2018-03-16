"use strict";
const assert = require("assert");
const util = require("util");
const promisify = util.promisify || require("util-promisify");
const path = require("path").win32;
const EventEmitter = require("events");
const Buffer = require("buffer").Buffer;
const proxyquire = require("proxyquire");
const childProcessMock = {
	spawnSync: function (command, args) {
		if (command === "reg.exe" && /^QUERY$/.test(args[0])) {
			const key = args[1];
			const valueName = args[3];
			const value = regMock[path.join(key, valueName)];
			if (value) {
				return {
					stdout: [
						key + "\n",
						valueName,
						"REG_SZ",
						value,
					].join("\t"),
					stderr: "",
					status: 0,
				};
			} else {
				return {
					stderr: "The system was unable to find the specified registry key or value.",
					status: 1,
				};
			}
		}
	},
	spawn: function (command, args, callback) {
		if (command === "reg.exe" && /^QUERY$/.test(args[0])) {
			const cp = new EventEmitter();
			const key = args[1];
			const valueName = args[3];
			const value = regMock[path.join(key, valueName)];
			if (value) {
				cp.stdout = new EventEmitter();
			} else {
				cp.stderr = new EventEmitter();
			}

			process.nextTick(() => {
				if (value) {
					cp.stdout.emit("data", Buffer.from([
						key + "\n",
						valueName,
						"REG_SZ",
						value,
					].join("\t")));
					cp.emit("exit", 0);
				} else {
					cp.stderr.emit("data", Buffer.from("The system was unable to find the specified registry key or value."));
					cp.emit("exit", 1);
				}
			});
			return cp;
		}
	},
};
let geoAsync;
let geoSync;
let regMock = {};

describe("geo", () => {
	before(() => {
		delete require.cache[require.resolve("../lib/geo")];

		const geo = proxyquire("../lib/geo", {
			"child_process": childProcessMock,
		});
		geoAsync = promisify(geo.async);
		geoSync = promisify(geo.sync);
		delete process.env.TZ;
	});

	afterEach(() => {
		regMock = {};
	});

	it("nation 45", async () => {
		regMock["HKCU\\Control Panel\\International\\Geo\\Nation"] = 45;
		await geoSync().then(nation => {
			assert.equal(nation, "45");
		});
		await geoAsync().then(nation => {
			assert.equal(nation, "45");
		});
	});

	it("default nation 45", async () => {
		regMock["HKU\\.DEFAULT\\Control Panel\\International\\Geo\\Nation"] = 45;
		await geoSync().then(nation => {
			assert.equal(nation, "45");
		});
		await geoAsync().then(nation => {
			assert.equal(nation, "45");
		});
	});

	it("The system was unable to find the specified registry key or value.", cb => {
		geoSync((error, result) => {
			try {
				assert.ok(error);
				assert.equal(error.exitStatus, 1);
				cb();
			} catch (ex) {
				cb(ex);
			}
		});
	});

	describe("spawn error", () => {
		before(() => {
			childProcessMock.spawn = childProcessMock.spawnSync = () => {
				throw new Error("spawn mock ENOENT");
			};
		});
		it("sync", cb => {
			geoSync((error, result) => {
				try {
					assert.ok(error);
					assert.equal(error.message, "spawn mock ENOENT");
					cb();
				} catch (ex) {
					cb(ex);
				}
			});
		});
		it("async", cb => {
			geoAsync((error, result) => {
				try {
					assert.ok(error);
					assert.equal(error.message, "spawn mock ENOENT");
					cb();
				} catch (ex) {
					cb(ex);
				}
			});
		});
	});
});

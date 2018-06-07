"use strict";
const assert = require("assert");
const util = require("util");
const promisify = util.promisify || require("util-promisify");
const path = require("path").win32;
const EventEmitter = require("events");
const Buffer = require("buffer").Buffer;
const proxyquire = require("proxyquire");

function spawnSync (command, args, options) {
	let key;
	let valueName;
	let stdout;
	let stderr;
	let error;
	const encoding = options && options.encoding;

	if (command === "powershell.exe") {
		const arg = args.find(arg => arg.startsWith("&"));
		key = arg.match(/"Registry::(.+?)"/)[1];
		valueName = arg.match(/\s+-Name\s+(\w+)/)[1];
	} else if (command === "reg.exe" && /^QUERY$/.test(args[0])) {
		key = args[1];
		valueName = args[3];
	} else {
		return;
	}

	const value = regMock[path.join(key, valueName)];
	if (value) {
		if (typeof value === "function") {
			return value(command, key, valueName);
		} else if (command === "reg.exe") {
			stdout = [
				key + "\n",
				valueName,
				"REG_SZ",
				value,
			].join("\t");
		} else {
			stdout = value + "\r\n";
		}
	} else if (command === "reg.exe") {
		stderr = "The system was unable to find the specified registry key or value.";
	} else {
		stderr = `Get-ItemProperty : Cannot find path '${key}' because it does not exist.`;
	}

	stdout = stdout && Buffer.from(stdout);
	stderr = stderr && Buffer.from(stderr);

	if (encoding && encoding !== "buffer") {
		stdout = stdout && stdout.toString(encoding);
		stderr = stderr && stderr.toString(encoding);
	}

	return {
		error,
		stdout,
		stderr,
		status: value && !error ? 0 : 1,
	};
}

function spawn (command, args, options) {
	const cp = new EventEmitter();
	const result = spawnSync(command, args, {
		encoding: "buffer",
	});

	if (result.stdout) {
		cp.stdout = new EventEmitter();
	}

	if (result.stderr) {
		cp.stderr = new EventEmitter();
	}

	process.nextTick(() => {
		if (result.error) {
			cp.emit("error", result.error);
		}
		if (result.stdout) {
			cp.stdout.emit("data", result.stdout);
		}
		if (result.stderr) {
			cp.stderr.emit("data", result.stderr);
		}
		cp.emit("exit", result.status);
	});
	return cp;
}

let geoAsync;
let geoSync;
let regMock = {};

describe("geo", () => {
	before(() => {
		delete require.cache[require.resolve("../lib/geo")];

		const geo = proxyquire("../lib/geo", {
			"child_process": {
				spawnSync,
				spawn,
			},
		});
		geoAsync = promisify(geo.async);
		geoSync = promisify(geo.sync);
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

	it("unable to find registry key or value.", cb => {
		geoSync((error, result) => {
			try {
				assert.ok(error);
				assert.equal(error.message, "Get-ItemProperty : Cannot find path 'HKU\\.DEFAULT\\Control Panel\\International\\Geo' because it does not exist.");
				assert.equal(error.exitStatus, 1);
				cb();
			} catch (ex) {
				cb(ex);
			}
		});
	});

	describe("spawn error", () => {
		beforeEach(() => {
			regMock["HKU\\.DEFAULT\\Control Panel\\International\\Geo\\Nation"] = () => {
				return {
					error: new Error("spawn mock ENOENT"),
				};
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

	describe("Exited with status 1", () => {
		beforeEach(() => {
			regMock["HKU\\.DEFAULT\\Control Panel\\International\\Geo\\Nation"] = () => {
				return {
					status: 1,
				};
			};
		});
		it("sync", cb => {
			geoSync((error, result) => {
				try {
					assert.ok(error);
					assert.equal(error.message, "Exited with status 1");
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
					assert.equal(error.message, "Exited with status 1");
					cb();
				} catch (ex) {
					cb(ex);
				}
			});
		});
	});

	describe("stdout not match", () => {
		beforeEach(() => {
			regMock["HKU\\.DEFAULT\\Control Panel\\International\\Geo\\Nation"] = () => {
				return {
					stdout: Buffer.from("not exist"),
				};
			};
		});
		it("sync", cb => {
			geoSync((error, result) => {
				try {
					assert.equal(error, "not exist");
					cb();
				} catch (ex) {
					cb(ex);
				}
			});
		});
		it("async", cb => {
			geoAsync((error, result) => {
				try {
					assert.equal(error, "not exist");
					cb();
				} catch (ex) {
					cb(ex);
				}
			});
		});
	});

	describe("stdout not match for reg.exe", () => {
		beforeEach(() => {
			regMock["HKU\\.DEFAULT\\Control Panel\\International\\Geo\\Nation"] = () => {
				return {
					stdout: Buffer.from("45\r\n"),
				};
			};
		});
		it("sync", cb => {
			geoSync((error, result) => {
				try {
					assert.equal(result, "45");
					assert.equal(error, null);
					cb();
				} catch (ex) {
					cb(ex);
				}
			});
		});
		it("async", cb => {
			geoAsync((error, result) => {
				try {
					assert.equal(result, "45");
					assert.equal(error, null);
					cb();
				} catch (ex) {
					cb(ex);
				}
			});
		});
	});

	if (process.platform === "win32") {
		describe("win32", () => {
			before(() => {
				delete require.cache[require.resolve("../lib/geo")];

				const geo = require("../lib/geo");
				geoAsync = promisify(geo.async);
				geoSync = promisify(geo.sync);
			});
			it("should not throw error for geo.async", () => {
				return geoAsync();
			});
			it("should not throw error for geo.sync", () => {
				return geoSync();
			});
		});
	}
});

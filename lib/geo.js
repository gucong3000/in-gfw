"use strict";
const childProcess = require("child_process");
function closeArgsToError (code, signal) {
	// code === null when child_process is killed
	if (code) {
		const err = new Error(`Exited with status ${code}`);
		err.exitStatus = code;
		return err;
	}
	return null;
};
function prepareStream (stream) {
	if (stream == null) {
		return null;
	}
	const buffers = [];
	stream.on("data", (data) => {
		buffers.push(data);
	});
	return buffers;
};

function concatBuffer (buffer) {
	return buffer && Buffer.concat(buffer).toString();
}

function spawn () {
	const args = Array.from(arguments);
	const callback = args.pop();
	let cp;
	try {
		cp = childProcess.spawn.apply(childProcess, args);
	} catch (ex) {
		return callback(ex);
	}
	const stderr = prepareStream(cp.stderr);
	let stdout = prepareStream(cp.stdout);

	cp.once("exit", code => {
		const error = closeArgsToError(code);
		stdout = concatBuffer(stdout);
		if (error) {
			error.stderr = concatBuffer(stderr);
			error.stdout = stdout;
		}
		callback(error || null, stdout);
	});
}

function spawnSync () {
	const args = Array.from(arguments);
	const callback = args.pop();
	let cp;
	try {
		cp = childProcess.spawnSync.apply(childProcess, args);
	} catch (ex) {
		return callback(ex);
	}

	const stdout = cp.stdout && cp.stdout.toString();
	const error = closeArgsToError(cp.status);
	if (error) {
		error.stderr = cp.stderr && cp.stderr.toString();
		error.stdout = stdout;
	}
	callback(error || null, stdout);
}

function geo (spawn) {
	function regQuery (KeyName, ValueName, callback) {
		const args = [
			"QUERY",
			KeyName,
			"/v",
			ValueName,
		];
		if (/64$/.test(process.env.PROCESSOR_ARCHITEW6432 || process.arch)) {
			args.push("/reg:64");
		}
		spawn("reg.exe", args, (error, stdout) => {
			if (stdout && /^\s*\S+\s+REG(?:_[A-Z]+)+\s+(.*)$/im.test(stdout)) {
				callback(null, RegExp.$1);
			} else {
				callback(error || stdout);
			}
		});
	}

	function getNation (parentError, callback) {
		regQuery((parentError ? "HKU\\.DEFAULT" : "HKCU") + "\\Control Panel\\International\\Geo", "Nation", (error, nation) => {
			if (!error && nation) {
				callback(null, nation);
			} else if (parentError) {
				callback(parentError);
			} else {
				getNation(error, callback);
			}
		});
	}

	function geo (callback) {
		getNation(null, callback);
	}
	return geo;
}

module.exports = {
	async: geo(spawn),
	sync: geo(spawnSync),
};

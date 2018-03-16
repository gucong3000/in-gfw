"use strict";
const https = require("https");
const http = require("http");
const url = require("url");

module.exports = (blockedHost, cnHost) => {
	let reqs = [];
	function head (config) {
		if (typeof config === "string") {
			if (/^https?:\/\//i.test(config)) {
				config = url.parse(config);
			} else {
				config = {
					hostname: config,
				};
			}
		}
		const request = ((!config.protocol || /^https:$/i.test(config.protocol)) ? https : http).request;
		return new Promise((resolve, reject) => {
			const req = request(Object.assign(config, {
				method: "HEAD",
			}), res => {
				resolve(true);
				abort();
			});

			req.on("error", error => {
				/* istanbul ignore if */
				if (error.errno && /^(?:ETIMEDOUT|ECONNRESET)$/.test(error.errno)) {
					resolve(false);
				} else {
					reject(error);
				}
				abort();
			});
			req.end();
			reqs.push(req);
		});
	}
	function abort () {
		if (reqs) {
			reqs.forEach(req => req.abort());
			reqs = null;
		}
	}
	return Promise.race([
		head(blockedHost || "www.npmjs.com").then(result => !result),
		head(cnHost || "npm.taobao.org"),
	]);
};

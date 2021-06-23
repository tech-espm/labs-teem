"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferRequest = exports.StringRequest = exports.JSONRequest = void 0;
const http = require("http");
const https = require("https");
const url_1 = require("url");
const zlib = require("zlib");
async function send(method, url, jsonBody, body, bodyContentType, jsonResponse, rawBuffer, userOptions, redirCount) {
	return new Promise(function (resolve, reject) {
		try {
			const u = (((typeof url) === "string") ? new url_1.URL(url) : url), options = {
				host: u.hostname || u.host,
				port: (u.port || (u.protocol === "https:" ? 443 : 80)),
				path: (u.search ? (u.pathname + u.search) : u.pathname),
				method: method,
				headers: {
					"accept-encoding": "br, gzip, deflate",
					"cache-control": "no-cache, no-store",
					"pragma": "no-cache"
				}
			};
			if (options.headers) {
				if (jsonResponse)
					options.headers["accept"] = "application/json";
				if (jsonBody) {
					options.headers["content-type"] = "application/json";
				}
				else if (body) {
					if (!body.length)
						reject(new Error("Invalid buffer length"));
					options.headers["content-type"] = (bodyContentType || "application/octet-stream");
				}
				if (userOptions && userOptions.headers) {
					const headers = userOptions.headers;
					for (let h in headers)
						options.headers[h] = headers[h];
				}
			}
			// https://github.com/nodejs/node/blob/master/lib/_http_client.js
			// https://github.com/nodejs/node/blob/master/lib/_http_outgoing.js
			// https://nodejs.org/api/http.html#http_class_http_clientrequest
			// https://nodejs.org/api/http.html#http_class_http_incomingmessage
			// https://nodejs.org/api/stream.html#stream_event_data
			// https://nodejs.org/api/buffer.html
			const httpreq = ((u.protocol === "https:") ? https.request : http.request)(options, function (response) {
				let bufferArray = [], streams = [response];
				const cleanUp = function () {
					if (!bufferArray || !streams)
						return false;
					const localBufferArray = bufferArray, localStreams = streams;
					bufferArray = null;
					streams = null;
					for (let i = localStreams.length - 2; i >= 0; i--) {
						try {
							const stream = localStreams[i];
							if (stream && !stream.destroyed)
								stream.unpipe();
						}
						catch (e) {
							// Just ignore
						}
					}
					for (let i = 0; i < localStreams.length; i++) {
						try {
							const stream = localStreams[i];
							if (stream && !stream.destroyed)
								stream.destroy();
						}
						catch (e) {
							// Just ignore
						}
					}
					try {
						if ((typeof httpreq["abort"]) === "function")
							httpreq.abort();
					}
					catch (e) {
						// Just ignore
					}
					try {
						httpreq.destroy();
					}
					catch (e) {
						// Just ignore
					}
					localBufferArray.splice(0);
					localStreams.splice(0);
					return true;
				};
				const errorHandler = function (err) {
					if (cleanUp())
						reject(err || new Error("Unknown error"));
				};
				response.setTimeout((userOptions && userOptions.responseTimeout !== undefined) ? userOptions.responseTimeout : 30000, function () {
					if (cleanUp())
						reject(new Error("Response timeout"));
				});
				response.on("error", errorHandler);
				// The listener callback will be passed the chunk of data as a string if a
				// default encoding has been specified for the stream using the readable.setEncoding()
				// method; otherwise the data will be passed as a Buffer.
				//response.setEncoding("utf8");
				const contentEncoding = response.headers["content-encoding"];
				if (contentEncoding) {
					// https://nodejs.org/api/stream.html
					// https://nodejs.org/api/zlib.html#zlib_compressing_http_requests_and_responses
					const encodings = contentEncoding.split(",");
					for (let i = 0; i < encodings.length; i++) {
						let decompressionStream;
						const encoding = encodings[i].trim();
						switch (encoding) {
							case "br":
								decompressionStream = zlib.createBrotliDecompress();
								break;
							case "gzip":
								decompressionStream = zlib.createGunzip();
								break;
							case "deflate":
								decompressionStream = zlib.createInflate();
								break;
							case "identity":
								// Just skip this step as no compression has been applied to it
								continue;
							default:
								errorHandler(new Error(`Invalid encoding "${encoding}" in header "content-encoding: ${contentEncoding}"`));
								return;
						}
						decompressionStream.on("error", errorHandler);
						const stream = streams[streams.length - 1];
						if (stream) {
							stream.pipe(decompressionStream, { end: true });
							streams.push(decompressionStream);
						}
					}
				}
				const lastStream = streams[streams.length - 1];
				if (!lastStream)
					return;
				lastStream.on("data", function (chunk) {
					if (chunk && chunk.length && bufferArray)
						bufferArray.push(chunk);
				});
				lastStream.on("end", function () {
					if (!bufferArray || !streams)
						return;
					let str = null, buffer = null;
					try {
						if (response.statusCode && response.statusCode >= 300 && response.statusCode <= 399 && response.headers.location) {
							if (redirCount >= 10) {
								errorHandler(new Error("Too many redirects! Last redirected address: " + response.headers.location));
							}
							else {
								const u = new url_1.URL(response.headers.location, url);
								resolve(send(method, u.toString(), jsonBody, body, bodyContentType, jsonResponse, rawBuffer, userOptions, redirCount + 1));
								cleanUp();
							}
							return;
						}
						if (bufferArray.length) {
							buffer = ((bufferArray.length === 1) ? bufferArray[0] : Buffer.concat(bufferArray));
							if (!rawBuffer)
								str = buffer.toString("utf8");
						}
					}
					catch (e) {
						errorHandler(e);
						return;
					}
					const statusCode = (response.statusCode || 0);
					if (rawBuffer) {
						resolve({
							success: (statusCode >= 200 && statusCode <= 299),
							statusCode,
							headers: response.headers,
							result: buffer
						});
					}
					else if (jsonResponse) {
						try {
							resolve({
								success: (statusCode >= 200 && statusCode <= 299),
								parseSuccess: true,
								statusCode,
								headers: response.headers,
								result: (str ? JSON.parse(str) : null)
							});
						}
						catch (e) {
							resolve({
								success: false,
								parseSuccess: false,
								statusCode,
								headers: response.headers,
								result: str
							});
						}
					}
					else {
						resolve({
							success: (statusCode >= 200 && statusCode <= 299),
							statusCode,
							headers: response.headers,
							result: str
						});
					}
					cleanUp();
				});
			});
			httpreq.setTimeout((userOptions && userOptions.requestTimeout !== undefined) ? userOptions.requestTimeout : 30000, function () {
				reject(new Error("Request timeout"));
			});
			httpreq.on("error", function (err) {
				reject(err || new Error("Unknown error"));
			});
			if (jsonBody)
				httpreq.end(jsonBody, "utf8");
			else if (body)
				httpreq.end(body);
			else
				httpreq.end();
		}
		catch (e) {
			reject(e);
		}
	});
}
class JSONRequest {
	static async delete(url, options) {
		return send("DELETE", url, null, null, null, true, false, options, 0);
	}
	static async deleteBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("DELETE", url, null, body, contentType, true, false, options, 0);
	}
	static async deleteObject(url, object, options) {
		return send("DELETE", url, JSON.stringify(object), null, null, true, false, options, 0);
	}
	static async get(url, options) {
		return send("GET", url, null, null, null, true, false, options, 0);
	}
	static async patchBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("PATCH", url, null, body, contentType, true, false, options, 0);
	}
	static async patchObject(url, object, options) {
		return send("PATCH", url, JSON.stringify(object), null, null, true, false, options, 0);
	}
	static async postBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("POST", url, null, body, contentType, true, false, options, 0);
	}
	static async postObject(url, object, options) {
		return send("POST", url, JSON.stringify(object), null, null, true, false, options, 0);
	}
	static async putBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("PUT", url, null, body, contentType, true, false, options, 0);
	}
	static async putObject(url, object, options) {
		return send("PUT", url, JSON.stringify(object), null, null, true, false, options, 0);
	}
}
exports.JSONRequest = JSONRequest;
class StringRequest {
	static async delete(url, options) {
		return send("DELETE", url, null, null, null, false, false, options, 0);
	}
	static async deleteBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("DELETE", url, null, body, contentType, false, false, options, 0);
	}
	static async deleteObject(url, object, options) {
		return send("DELETE", url, JSON.stringify(object), null, null, false, false, options, 0);
	}
	static async get(url, options) {
		return send("GET", url, null, null, null, false, false, options, 0);
	}
	static async patchBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("PATCH", url, null, body, contentType, false, false, options, 0);
	}
	static async patchObject(url, object, options) {
		return send("PATCH", url, JSON.stringify(object), null, null, false, false, options, 0);
	}
	static async postBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("POST", url, null, body, contentType, false, false, options, 0);
	}
	static async postObject(url, object, options) {
		return send("POST", url, JSON.stringify(object), null, null, false, false, options, 0);
	}
	static async putBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("PUT", url, null, body, contentType, false, false, options, 0);
	}
	static async putObject(url, object, options) {
		return send("PUT", url, JSON.stringify(object), null, null, false, false, options, 0);
	}
}
exports.StringRequest = StringRequest;
class BufferRequest {
	static async delete(url, options) {
		return send("DELETE", url, null, null, null, false, true, options, 0);
	}
	static async deleteBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("DELETE", url, null, body, contentType, false, true, options, 0);
	}
	static async deleteObject(url, object, options) {
		return send("DELETE", url, JSON.stringify(object), null, null, false, true, options, 0);
	}
	static async get(url, options) {
		return send("GET", url, null, null, null, false, true, options, 0);
	}
	static async patchBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("PATCH", url, null, body, contentType, false, true, options, 0);
	}
	static async patchObject(url, object, options) {
		return send("PATCH", url, JSON.stringify(object), null, null, false, true, options, 0);
	}
	static async postBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("POST", url, null, body, contentType, false, true, options, 0);
	}
	static async postObject(url, object, options) {
		return send("POST", url, JSON.stringify(object), null, null, false, true, options, 0);
	}
	static async putBuffer(url, body, contentType, options) {
		if (!body)
			throw new Error("Invalid body");
		if (!contentType)
			throw new Error("Invalid contentType");
		return send("PUT", url, null, body, contentType, false, true, options, 0);
	}
	static async putObject(url, object, options) {
		return send("PUT", url, JSON.stringify(object), null, null, false, true, options, 0);
	}
}
exports.BufferRequest = BufferRequest;

import http = require("http");
import https = require("https");
import { Readable, Transform } from "stream";
import { URL } from "url";
import zlib = require("zlib");

async function send(method: string, url: string, jsonBody: string, body: Buffer, bodyContentType: string, jsonResponse: boolean, rawBuffer: boolean, headers: any, redirCount: number): Promise<JSONResponse | StringResponse | BufferResponse> {
	return new Promise<JSONResponse | StringResponse | BufferResponse>(function (resolve, reject) {
		try {
			const u = new URL(url),
				options: http.RequestOptions = {
					host: u.hostname || u.host, // host includes the port, while hostname doesn't
					port: (u.port || (u.protocol === "https:" ? 443 : 80)),
					path: (u.search ? (u.pathname + u.search) : u.pathname),
					method: method,
					headers: {
						"accept-encoding": "br, gzip, deflate",
						"cache-control": "no-cache, no-store",
						"pragma": "no-cache"
					}
				};

			if (jsonResponse)
				options.headers["accept"] = "application/json";

			if (jsonBody) {
				options.headers["content-type"] = "application/json";
			} else if (body) {
				if (!body.length)
					reject(new Error("Invalid buffer length"));
				options.headers["content-type"] = (bodyContentType || "application/octet-stream");
			}

			if (headers) {
				for (let h in headers)
					options.headers[h] = headers[h];
			}

			// https://github.com/nodejs/node/blob/master/lib/_http_client.js
			// https://github.com/nodejs/node/blob/master/lib/_http_outgoing.js
			// https://nodejs.org/api/http.html#http_class_http_clientrequest
			// https://nodejs.org/api/http.html#http_class_http_incomingmessage
			// https://nodejs.org/api/stream.html#stream_event_data
			// https://nodejs.org/api/buffer.html
			const httpreq = ((u.protocol === "https:") ? https.request : http.request)(options, function (response) {
				let done = false,
					bufferArray: Buffer[] = [],
					streams: Readable[] = [response];

				const cleanUp = function (): boolean {
					if (done)
						return false;

					done = true;

					for (let i = streams.length - 2; i >= 0; i--) {
						try {
							if (!streams[i].destroyed)
								streams[i].unpipe();
						} catch (e) {
							// Just ignore
						}
					}

					for (let i = 0; i < streams.length; i++) {
						try {
							if (!streams[i].destroyed)
								streams[i].destroy();
						} catch (e) {
							// Just ignore
						}
					}

					try {
						if ((typeof httpreq["abort"]) === "function")
							httpreq.abort();
					} catch (e) {
						// Just ignore
					}

					try {
						httpreq.destroy();
					} catch (e) {
						// Just ignore
					}

					bufferArray.fill(null);
					streams.fill(null);

					bufferArray = null;
					streams = null;

					return true;
				};

				const errorHandler = function (err: any): void {
					if (cleanUp())
						reject(err || new Error("Unknown error"));
				};

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
						let decompressionStream: Transform;
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

						streams[streams.length - 1].pipe(decompressionStream, { end: true });
						streams.push(decompressionStream);
					}
				}

				const lastStream = streams[streams.length - 1];

				lastStream.on("data", function (chunk) {
					if (chunk && chunk.length)
						bufferArray.push(chunk);
				});

				lastStream.on("end", function () {
					if (done)
						return;

					let str: string = null,
						buffer: Buffer = null;

					try {
						if (response.statusCode >= 300 && response.statusCode <= 399 && response.headers.location) {
							if (redirCount >= 10) {
								errorHandler(new Error("Too many redirects! Last redirected address: " + response.headers.location));
							} else {
								const u: URL = new URL(response.headers.location, url);
								resolve(send(method, u.toString(), jsonBody, body, bodyContentType, jsonResponse, rawBuffer, headers, redirCount + 1));
								cleanUp();
							}
							return;
						}

						if (bufferArray.length) {
							buffer = ((bufferArray.length === 1) ? bufferArray[0] : Buffer.concat(bufferArray));
							if (!rawBuffer)
								str = buffer.toString("utf8");
						}
					} catch (e) {
						errorHandler(e);
						return;
					}

					if (rawBuffer) {
						resolve({
							success: (response.statusCode >= 200 && response.statusCode <= 299),
							statusCode: response.statusCode,
							headers: response.headers,
							result: buffer
						});
					} else if (jsonResponse) {
						try {
							resolve({
								success: (response.statusCode >= 200 && response.statusCode <= 299),
								parseSuccess: true,
								statusCode: response.statusCode,
								headers: response.headers,
								result: (str ? JSON.parse(str) : null)
							});
						} catch (e) {
							resolve({
								success: false,
								parseSuccess: false,
								statusCode: response.statusCode,
								headers: response.headers,
								result: str
							});
						}
					} else {
						resolve({
							success: (response.statusCode >= 200 && response.statusCode <= 299),
							statusCode: response.statusCode,
							headers: response.headers,
							result: str
						});
					}

					cleanUp();
				})
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
		} catch (e) {
			reject(e);
		}
	});
}

export interface Response {
	/**
	 * Indicates whether the request was successful or not.
	 * 
	 * To be considered successful, a request must have been completed, its status code must be between `200` and `299` (inclusive) and its response must be a valid JSON string.
	 * 
	 * If `parseSuccess` is `false`, `success` will also be `false`. On the other hand, if `parseSuccess` is `true`, `success` can be either `true` or `false.
	 */
	success: boolean;

	/**
	 * The HTTP status code of the response.
	 */
	statusCode: number;

	/**
	 * The HTTP headers of the response.
	 */
	headers: http.IncomingHttpHeaders;
}

export interface JSONResponse extends Response {
	/**
	 * Indicates whether the response was successfully parsed as JSON or not.
	 * 
	 * If `parseSuccess` is `false`, `success` will also be `false`. On the other hand, if `parseSuccess` is `true`, `success` can be either `true` or `false.
	 */
	parseSuccess: boolean;

	/**
	 * Contains the parsed JSON response.
	 * 
	 * If `parseSuccess` is `false`, `result` will be the raw string received from the remote server.
	 * 
	 * `result` could contain a valid object even if `success` is `false`. For example, when the remote server returns a response with status code `500` along with a JSON object describing its internal error.
	 */
	result: any;
}

export interface StringResponse extends Response {
	/**
	 * Contains the response.
	 * 
	 * `result` could contain a valid value even if `success` is `false`. For example, when the remote server returns a response with status code `500` along with a HTML page describing its internal error.
	 */
	result: string;
}

export interface BufferResponse extends Response {
	/**
	 * Contains the response.
	 * 
	 * `result` could contain a valid value even if `success` is `false`. For example, when the remote server returns a response with status code `500` along with a HTML page describing its internal error.
	 */
	result: Buffer;
}

export class JSONRequest {
	public static async delete(url: string, headers?: any): Promise<JSONResponse> {
		return send("DELETE", url, null, null, null, true, false, headers, 0) as Promise<JSONResponse>;
	}

	public static async deleteObject(url: string, object: any, headers?: any): Promise<JSONResponse> {
		return send("DELETE", url, JSON.stringify(object), null, null, true, false, headers, 0) as Promise<JSONResponse>;
	}

	public static async deleteBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("DELETE", url, null, body, contentType, true, false, headers, 0) as Promise<JSONResponse>;
	}

	public static async get(url: string, headers?: any): Promise<JSONResponse> {
		return send("GET", url, null, null, null, true, false, headers, 0) as Promise<JSONResponse>;
	}

	public static async patch(url: string, object: any, headers?: any): Promise<JSONResponse> {
		return send("PATCH", url, JSON.stringify(object), null, null, true, false, headers, 0) as Promise<JSONResponse>;
	}

	public static async patchBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PATCH", url, null, body, contentType, true, false, headers, 0) as Promise<JSONResponse>;
	}

	public static async post(url: string, object: any, headers?: any): Promise<JSONResponse> {
		return send("POST", url, JSON.stringify(object), null, null, true, false, headers, 0) as Promise<JSONResponse>;
	}

	public static async postBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("POST", url, null, body, contentType, true, false, headers, 0) as Promise<JSONResponse>;
	}

	public static async put(url: string, object: any, headers?: any): Promise<JSONResponse> {
		return send("PUT", url, JSON.stringify(object), null, null, true, false, headers, 0) as Promise<JSONResponse>;
	}

	public static async putBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PUT", url, null, body, contentType, true, false, headers, 0) as Promise<JSONResponse>;
	}
}

export class StringRequest {
	public static async delete(url: string, headers?: any): Promise<StringResponse> {
		return send("DELETE", url, null, null, null, false, false, headers, 0) as Promise<StringResponse>;
	}

	public static async deleteObject(url: string, object: any, headers?: any): Promise<StringResponse> {
		return send("DELETE", url, JSON.stringify(object), null, null, false, false, headers, 0) as Promise<StringResponse>;
	}

	public static async deleteBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<StringResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("DELETE", url, null, body, contentType, false, false, headers, 0) as Promise<StringResponse>;
	}

	public static async get(url: string, headers?: any): Promise<StringResponse> {
		return send("GET", url, null, null, null, false, false, headers, 0) as Promise<StringResponse>;
	}

	public static async patch(url: string, object: any, headers?: any): Promise<StringResponse> {
		return send("PATCH", url, JSON.stringify(object), null, null, false, false, headers, 0) as Promise<StringResponse>;
	}

	public static async patchBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<StringResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PATCH", url, null, body, contentType, false, false, headers, 0) as Promise<StringResponse>;
	}

	public static async post(url: string, object: any, headers?: any): Promise<StringResponse> {
		return send("POST", url, JSON.stringify(object), null, null, false, false, headers, 0) as Promise<StringResponse>;
	}

	public static async postBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<StringResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("POST", url, null, body, contentType, false, false, headers, 0) as Promise<StringResponse>;
	}

	public static async put(url: string, object: any, headers?: any): Promise<StringResponse> {
		return send("PUT", url, JSON.stringify(object), null, null, false, false, headers, 0) as Promise<StringResponse>;
	}

	public static async putBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<StringResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PUT", url, null, body, contentType, false, false, headers, 0) as Promise<StringResponse>;
	}
}

export class BufferRequest {
	public static async delete(url: string, headers?: any): Promise<BufferResponse> {
		return send("DELETE", url, null, null, null, false, true, headers, 0) as Promise<BufferResponse>;
	}

	public static async deleteObject(url: string, object: any, headers?: any): Promise<BufferResponse> {
		return send("DELETE", url, JSON.stringify(object), null, null, false, true, headers, 0) as Promise<BufferResponse>;
	}

	public static async deleteBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<BufferResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("DELETE", url, null, body, contentType, false, true, headers, 0) as Promise<BufferResponse>;
	}

	public static async get(url: string, headers?: any): Promise<BufferResponse> {
		return send("GET", url, null, null, null, false, true, headers, 0) as Promise<BufferResponse>;
	}

	public static async patch(url: string, object: any, headers?: any): Promise<BufferResponse> {
		return send("PATCH", url, JSON.stringify(object), null, null, false, true, headers, 0) as Promise<BufferResponse>;
	}

	public static async patchBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<BufferResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PATCH", url, null, body, contentType, false, true, headers, 0) as Promise<BufferResponse>;
	}

	public static async post(url: string, object: any, headers?: any): Promise<BufferResponse> {
		return send("POST", url, JSON.stringify(object), null, null, false, true, headers, 0) as Promise<BufferResponse>;
	}

	public static async postBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<BufferResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("POST", url, null, body, contentType, false, true, headers, 0) as Promise<BufferResponse>;
	}

	public static async put(url: string, object: any, headers?: any): Promise<BufferResponse> {
		return send("PUT", url, JSON.stringify(object), null, null, false, true, headers, 0) as Promise<BufferResponse>;
	}

	public static async putBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<BufferResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PUT", url, null, body, contentType, false, true, headers, 0) as Promise<BufferResponse>;
	}
}

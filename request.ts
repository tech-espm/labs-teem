import http = require("http");
import https = require("https");
import { Readable, Transform } from "stream";
import { URL } from "url";
import zlib = require("zlib");

export interface RequestOptions {
	/**
	 * Optional object containing additional request headers, in the following form: `{ "header name 1": "header value 1", "header name 2": "header value 2" }`.
	 */
	headers?: any;

	/**
	 * Optional request timeout in milliseconds (default: 30000).
	 */
	requestTimeout?: number;

	/**
	 * Optional response timeout in milliseconds (default: 30000).
	 */
	responseTimeout?: number;
}

async function send(method: string, url: string | URL, jsonBody: string | null, body: Buffer | null, bodyContentType: string | null, jsonResponse: boolean, rawBuffer: boolean, userOptions: RequestOptions | null | undefined, redirCount: number): Promise<JSONResponse | StringResponse | BufferResponse> {
	return new Promise<JSONResponse | StringResponse | BufferResponse>(function (resolve, reject) {
		try {
			const u = (((typeof url) === "string") ? new URL(url as string) : (url as URL)),
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

			if (options.headers) {
				if (jsonResponse)
					options.headers["accept"] = "application/json";

				if (jsonBody) {
					options.headers["content-type"] = "application/json";
				} else if (body) {
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
				let bufferArray: Buffer[] | null = [],
					streams: Readable[] | null = [response];

				const cleanUp = function (): boolean {
					if (!bufferArray || !streams)
						return false;

					const localBufferArray = bufferArray,
						localStreams = streams;

					bufferArray = null;
					streams = null;

					for (let i = localStreams.length - 2; i >= 0; i--) {
						try {
							const stream = localStreams[i];
							if (stream && !stream.destroyed)
								stream.unpipe();
						} catch (e) {
							// Just ignore
						}
					}

					for (let i = 0; i < localStreams.length; i++) {
						try {
							const stream = localStreams[i];
							if (stream && !stream.destroyed)
								stream.destroy();
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

					localBufferArray.splice(0);
					localStreams.splice(0);

					return true;
				};

				const errorHandler = function (err: any): void {
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

					let str: string | null = null,
						buffer: Buffer | null = null;

					try {
						if (response.statusCode && response.statusCode >= 300 && response.statusCode <= 399 && response.headers.location) {
							if (redirCount >= 10) {
								errorHandler(new Error("Too many redirects! Last redirected address: " + response.headers.location));
							} else {
								const u: URL = new URL(response.headers.location, url);
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
					} catch (e) {
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
						} as BufferResponse);
					} else if (jsonResponse) {
						try {
							resolve({
								success: (statusCode >= 200 && statusCode <= 299),
								parseSuccess: true,
								statusCode,
								headers: response.headers,
								result: (str ? JSON.parse(str) : null)
							} as JSONResponse);
						} catch (e) {
							resolve({
								success: false,
								parseSuccess: false,
								statusCode,
								headers: response.headers,
								result: str
							} as StringResponse);
						}
					} else {
						resolve({
							success: (statusCode >= 200 && statusCode <= 299),
							statusCode,
							headers: response.headers,
							result: str
						} as StringResponse);
					}

					cleanUp();
				})
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
		} catch (e) {
			reject(e);
		}
	});
}

export interface CommonResponse {
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

export interface JSONResponse extends CommonResponse {
	/**
	 * Indicates whether the response was successfully parsed as JSON or not.
	 * 
	 * If `parseSuccess` is `false`, `success` will also be `false`. On the other hand, if `parseSuccess` is `true`, `success` can be either `true` or `false`. Therefore, if `success` is `true`, `parseSucess` is also `true`.
	 */
	parseSuccess: boolean;

	/**
	 * Contains the server response, already parsed as JSON.
	 * 
	 * If `parseSuccess` is `false`, `result` will be the raw string received from the remote server.
	 * 
	 * `result` could contain a valid object even if `success` is `false`. For example, when the remote server returns a response with status code `500` along with a JSON object describing its internal error.
	 */
	result?: any;
}

export interface StringResponse extends CommonResponse {
	/**
	 * Contains the server response.
	 * 
	 * `result` could contain a valid value even if `success` is `false`. For example, when the remote server returns a response with status code `500` along with a HTML page describing its internal error.
	 */
	result?: string;
}

export interface BufferResponse extends CommonResponse {
	/**
	 * Contains the server response.
	 * 
	 * `result` could contain a valid value even if `success` is `false`. For example, when the remote server returns a response with status code `500` along with a HTML page describing its internal error.
	 */
	result?: Buffer;
}

export class JSONRequest {
	public static async delete(url: string | URL, options?: RequestOptions): Promise<JSONResponse> {
		return send("DELETE", url, null, null, null, true, false, options, 0) as Promise<JSONResponse>;
	}

	public static async deleteBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("DELETE", url, null, body, contentType, true, false, options, 0) as Promise<JSONResponse>;
	}

	public static async deleteObject(url: string | URL, object: any, options?: RequestOptions): Promise<JSONResponse> {
		return send("DELETE", url, JSON.stringify(object), null, null, true, false, options, 0) as Promise<JSONResponse>;
	}

	public static async get(url: string | URL, options?: RequestOptions): Promise<JSONResponse> {
		return send("GET", url, null, null, null, true, false, options, 0) as Promise<JSONResponse>;
	}

	public static async patchBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PATCH", url, null, body, contentType, true, false, options, 0) as Promise<JSONResponse>;
	}

	public static async patchObject(url: string | URL, object: any, options?: RequestOptions): Promise<JSONResponse> {
		return send("PATCH", url, JSON.stringify(object), null, null, true, false, options, 0) as Promise<JSONResponse>;
	}

	public static async postBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("POST", url, null, body, contentType, true, false, options, 0) as Promise<JSONResponse>;
	}

	public static async postObject(url: string | URL, object: any, options?: RequestOptions): Promise<JSONResponse> {
		return send("POST", url, JSON.stringify(object), null, null, true, false, options, 0) as Promise<JSONResponse>;
	}

	public static async putBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PUT", url, null, body, contentType, true, false, options, 0) as Promise<JSONResponse>;
	}

	public static async putObject(url: string | URL, object: any, options?: RequestOptions): Promise<JSONResponse> {
		return send("PUT", url, JSON.stringify(object), null, null, true, false, options, 0) as Promise<JSONResponse>;
	}
}

export class StringRequest {
	public static async delete(url: string | URL, options?: RequestOptions): Promise<StringResponse> {
		return send("DELETE", url, null, null, null, false, false, options, 0) as Promise<StringResponse>;
	}

	public static async deleteBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<StringResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("DELETE", url, null, body, contentType, false, false, options, 0) as Promise<StringResponse>;
	}

	public static async deleteObject(url: string | URL, object: any, options?: RequestOptions): Promise<StringResponse> {
		return send("DELETE", url, JSON.stringify(object), null, null, false, false, options, 0) as Promise<StringResponse>;
	}

	public static async get(url: string | URL, options?: RequestOptions): Promise<StringResponse> {
		return send("GET", url, null, null, null, false, false, options, 0) as Promise<StringResponse>;
	}

	public static async patchBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<StringResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PATCH", url, null, body, contentType, false, false, options, 0) as Promise<StringResponse>;
	}

	public static async patchObject(url: string | URL, object: any, options?: RequestOptions): Promise<StringResponse> {
		return send("PATCH", url, JSON.stringify(object), null, null, false, false, options, 0) as Promise<StringResponse>;
	}

	public static async postBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<StringResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("POST", url, null, body, contentType, false, false, options, 0) as Promise<StringResponse>;
	}

	public static async postObject(url: string | URL, object: any, options?: RequestOptions): Promise<StringResponse> {
		return send("POST", url, JSON.stringify(object), null, null, false, false, options, 0) as Promise<StringResponse>;
	}

	public static async putBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<StringResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PUT", url, null, body, contentType, false, false, options, 0) as Promise<StringResponse>;
	}

	public static async putObject(url: string | URL, object: any, options?: RequestOptions): Promise<StringResponse> {
		return send("PUT", url, JSON.stringify(object), null, null, false, false, options, 0) as Promise<StringResponse>;
	}
}

export class BufferRequest {
	public static async delete(url: string | URL, options?: RequestOptions): Promise<BufferResponse> {
		return send("DELETE", url, null, null, null, false, true, options, 0) as Promise<BufferResponse>;
	}

	public static async deleteBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<BufferResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("DELETE", url, null, body, contentType, false, true, options, 0) as Promise<BufferResponse>;
	}

	public static async deleteObject(url: string | URL, object: any, options?: RequestOptions): Promise<BufferResponse> {
		return send("DELETE", url, JSON.stringify(object), null, null, false, true, options, 0) as Promise<BufferResponse>;
	}

	public static async get(url: string | URL, options?: RequestOptions): Promise<BufferResponse> {
		return send("GET", url, null, null, null, false, true, options, 0) as Promise<BufferResponse>;
	}

	public static async patchBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<BufferResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PATCH", url, null, body, contentType, false, true, options, 0) as Promise<BufferResponse>;
	}

	public static async patchObject(url: string | URL, object: any, options?: RequestOptions): Promise<BufferResponse> {
		return send("PATCH", url, JSON.stringify(object), null, null, false, true, options, 0) as Promise<BufferResponse>;
	}

	public static async postBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<BufferResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("POST", url, null, body, contentType, false, true, options, 0) as Promise<BufferResponse>;
	}

	public static async postObject(url: string | URL, object: any, options?: RequestOptions): Promise<BufferResponse> {
		return send("POST", url, JSON.stringify(object), null, null, false, true, options, 0) as Promise<BufferResponse>;
	}

	public static async putBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<BufferResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return send("PUT", url, null, body, contentType, false, true, options, 0) as Promise<BufferResponse>;
	}

	public static async putObject(url: string | URL, object: any, options?: RequestOptions): Promise<BufferResponse> {
		return send("PUT", url, JSON.stringify(object), null, null, false, true, options, 0) as Promise<BufferResponse>;
	}
}

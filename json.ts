import http = require("http");
import https = require("https");
import { URL } from "url";

export interface JSONResponse {
	/**
	 * Indicates whether the request was successful or not.
	 * 
	 * To be considered successful, a request must have been completed, its status code must be between `200` and `299` (inclusive) and its response must be a valid JSON string.
	 * 
	 * If `parseSuccess` is `false`, `success` will also be `false`. On the other hand, if `parseSuccess` is `true`, `success` can be either `true` or `false.
	 */
	success: boolean;

	/**
	 * Indicates whether the response was successfully parsed as JSON or not.
	 * 
	 * If `parseSuccess` is `false`, `success` will also be `false`. On the other hand, if `parseSuccess` is `true`, `success` can be either `true` or `false.
	 */
	parseSuccess: boolean;

	/**
	 * The HTTP status code of the response.
	 */
	statusCode: number;

	/**
	 * Contains the parsed JSON response.
	 * 
	 * If `parseSuccess` is `false`, `result` will be the raw string received from the remote server.
	 * 
	 * `result` could contain a valid object even if `success` is `false`. For example, when the remote server returns a response with status code `500` along with a JSON object describing its internal error.
	 */
	result: any;
}

export class JSONRequest {
	private static async send(method: string, url: string, jsonBody: string, body: Buffer, bodyContentType: string, headers: any): Promise<JSONResponse> {
		return new Promise<JSONResponse>(function (resolve, reject) {
			try {
				const u = new URL(url),
					options: http.RequestOptions = {
						host: u.hostname || u.host, // host includes the port, while hostname doesn't
						port: (u.port || (u.protocol === "https:" ? 443 : 80)),
						path: (u.search ? (u.pathname + u.search) : u.pathname),
						method: method,
						headers: { "Accept": "application/json" }
					};

				if (jsonBody) {
					options.headers["Content-Type"] = "application/json";
				} else if (body) {
					if (!body.length)
						reject(new Error("Invalid buffer length"));
					options.headers["Content-Type"] = (bodyContentType || "application/octet-stream");
				}

				if (headers) {
					for (let h in headers)
						options.headers[h] = headers[h];
				}

				const httpreq = ((u.protocol === "https:") ? https.request : http.request)(options, function (response) {
					let json = "";

					response.setEncoding("utf8");

					response.on("error", function (err) {
						reject(err || new Error("Unknown error"));
					});

					response.on("data", function (chunk) {
						json += chunk;
					});

					response.on("end", function () {
						try {
							resolve({
								success: (response.statusCode >= 200 && response.statusCode <= 299),
								parseSuccess: true,
								statusCode: response.statusCode,
								result: (json ? JSON.parse(json) : null)
							});
						} catch (e) {
							resolve({
								success: false,
								parseSuccess: false,
								statusCode: response.statusCode,
								result: json
							});
						}
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

	public static async delete(url: string, headers?: any): Promise<JSONResponse> {
		return JSONRequest.send("DELETE", url, null, null, null, headers);
	}

	public static async deleteObject(url: string, object: any, headers?: any): Promise<JSONResponse> {
		return JSONRequest.send("DELETE", url, JSON.stringify(object), null, null, headers);
	}

	public static async deleteBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return JSONRequest.send("DELETE", url, null, body, contentType, headers);
	}

	public static async get(url: string, headers?: any): Promise<JSONResponse> {
		return JSONRequest.send("GET", url, null, null, null, headers);
	}

	public static async patch(url: string, object: any, headers?: any): Promise<JSONResponse> {
		return JSONRequest.send("PATCH", url, JSON.stringify(object), null, null, headers);
	}

	public static async patchBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return JSONRequest.send("PATCH", url, null, body, contentType, headers);
	}

	public static async post(url: string, object: any, headers?: any): Promise<JSONResponse> {
		return JSONRequest.send("POST", url, JSON.stringify(object), null, null, headers);
	}

	public static async postBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return JSONRequest.send("POST", url, null, body, contentType, headers);
	}

	public static async put(url: string, object: any, headers?: any): Promise<JSONResponse> {
		return JSONRequest.send("PUT", url, JSON.stringify(object), null, null, headers);
	}

	public static async putBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse> {
		if (!body)
			throw new Error("Invalid body");

		if (!contentType)
			throw new Error("Invalid contentType");

		return JSONRequest.send("PUT", url, null, body, contentType, headers);
	}
}

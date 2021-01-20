import http = require("http");
import https = require("https");
import { URL } from "url";

export interface JSONResponse {
	success: boolean;
	statusCode: number;
	result: any;
	errorMessage: string;
}

export class JSONRequest {
	private static async send(method: string, url: string, jsonBody: string, headers: any): Promise<JSONResponse> {
		return new Promise<JSONResponse>((resolve, reject) => {
			try {
				const u = new URL(url),
					options: http.RequestOptions = {
						host: u.hostname || u.host, // host includes the port, while hostname doesn't
						port: (u.port || (u.protocol === "https:" ? 443 : 80)),
						path: (u.search ? (u.pathname + u.search) : u.pathname),
						method: method,
						headers: { "Accept": "application/json" }
					};

				if (jsonBody)
					options.headers["Content-Type"] = "application/json";

				if (headers) {
					for (let h in headers)
						options.headers[h] = headers[h];
				}

				const httpreq = ((u.protocol === "https:") ? https.request : http.request)(options, function (response) {
					let json = "";

					response.setEncoding("utf8");

					response.on("error", function (err) {
						resolve({
							success: false,
							statusCode: 0,
							result: null,
							errorMessage: err ? err.toString() : "Unknown error"
						});
					});

					response.on("data", function (chunk) {
						json += chunk;
					});

					response.on("end", function () {
						try {
							resolve({
								success: (response.statusCode >= 200 && response.statusCode <= 299),
								statusCode: response.statusCode,
								result: (json ? JSON.parse(json) : null),
								errorMessage: null
							});
						} catch (ex) {
							resolve({
								success: false,
								statusCode: response.statusCode,
								result: json,
								errorMessage: ex.message || ex.toString()
							});
						}
					})
				});

				if (jsonBody)
					httpreq.write(jsonBody);

				httpreq.end();
			} catch (ex) {
				reject(ex.message || ex.toString());
			}
		});
	}

	public static async get(url: string, headers?: any): Promise<JSONResponse> {
		return JSONRequest.send("GET", url, null, headers);
	}

	public static async delete(url: string, headers?: any): Promise<JSONResponse> {
		return JSONRequest.send("DELETE", url, null, headers);
	}

	public static async post(url: string, jsonBody: string, headers?: any): Promise<JSONResponse> {
		return JSONRequest.send("POST", url, jsonBody, headers);
	}

	public static async put(url: string, jsonBody: string, headers?: any): Promise<JSONResponse> {
		return JSONRequest.send("PUT", url, jsonBody, headers);
	}
}

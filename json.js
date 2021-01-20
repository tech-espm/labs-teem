"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONRequest = void 0;
const http = require("http");
const https = require("https");
const url_1 = require("url");
class JSONRequest {
    static async send(method, url, jsonBody, headers) {
        return new Promise((resolve, reject) => {
            try {
                const u = new url_1.URL(url), options = {
                    host: u.hostname || u.host,
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
                        }
                        catch (ex) {
                            resolve({
                                success: false,
                                statusCode: response.statusCode,
                                result: json,
                                errorMessage: ex.message || ex.toString()
                            });
                        }
                    });
                });
                if (jsonBody)
                    httpreq.write(jsonBody);
                httpreq.end();
            }
            catch (ex) {
                reject(ex.message || ex.toString());
            }
        });
    }
    static async get(url, headers) {
        return JSONRequest.send("GET", url, null, headers);
    }
    static async delete(url, headers) {
        return JSONRequest.send("DELETE", url, null, headers);
    }
    static async post(url, jsonBody, headers) {
        return JSONRequest.send("POST", url, jsonBody, headers);
    }
    static async put(url, jsonBody, headers) {
        return JSONRequest.send("PUT", url, jsonBody, headers);
    }
}
exports.JSONRequest = JSONRequest;

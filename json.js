"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONRequest = void 0;
const http = require("http");
const https = require("https");
const url_1 = require("url");
class JSONRequest {
    static async send(method, url, jsonBody, body, bodyContentType, headers) {
        return new Promise(function (resolve, reject) {
            try {
                const u = new url_1.URL(url), options = {
                    host: u.hostname || u.host,
                    port: (u.port || (u.protocol === "https:" ? 443 : 80)),
                    path: (u.search ? (u.pathname + u.search) : u.pathname),
                    method: method,
                    headers: { "Accept": "application/json" }
                };
                if (jsonBody) {
                    options.headers["Content-Type"] = "application/json";
                }
                else if (body) {
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
                        }
                        catch (e) {
                            resolve({
                                success: false,
                                parseSuccess: false,
                                statusCode: response.statusCode,
                                result: json
                            });
                        }
                    });
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
    static async delete(url, headers) {
        return JSONRequest.send("DELETE", url, null, null, null, headers);
    }
    static async deleteObject(url, object, headers) {
        return JSONRequest.send("DELETE", url, JSON.stringify(object), null, null, headers);
    }
    static async deleteBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return JSONRequest.send("DELETE", url, null, body, contentType, headers);
    }
    static async get(url, headers) {
        return JSONRequest.send("GET", url, null, null, null, headers);
    }
    static async patch(url, object, headers) {
        return JSONRequest.send("PATCH", url, JSON.stringify(object), null, null, headers);
    }
    static async patchBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return JSONRequest.send("PATCH", url, null, body, contentType, headers);
    }
    static async post(url, object, headers) {
        return JSONRequest.send("POST", url, JSON.stringify(object), null, null, headers);
    }
    static async postBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return JSONRequest.send("POST", url, null, body, contentType, headers);
    }
    static async put(url, object, headers) {
        return JSONRequest.send("PUT", url, JSON.stringify(object), null, null, headers);
    }
    static async putBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return JSONRequest.send("PUT", url, null, body, contentType, headers);
    }
}
exports.JSONRequest = JSONRequest;

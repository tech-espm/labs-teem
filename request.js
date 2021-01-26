"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferRequest = exports.StringRequest = exports.JSONRequest = void 0;
const http = require("http");
const https = require("https");
const url_1 = require("url");
const zlib = require("zlib");
async function send(method, url, jsonBody, body, bodyContentType, jsonResponse, rawBuffer, headers, redirCount) {
    return new Promise(function (resolve, reject) {
        try {
            const u = new url_1.URL(url), options = {
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
                let done = false, bufferArray = [], streams = [response];
                const cleanUp = function () {
                    if (done)
                        return false;
                    done = true;
                    for (let i = streams.length - 2; i >= 0; i--) {
                        try {
                            if (!streams[i].destroyed)
                                streams[i].unpipe();
                        }
                        catch (e) {
                            // Just ignore
                        }
                    }
                    for (let i = 0; i < streams.length; i++) {
                        try {
                            if (!streams[i].destroyed)
                                streams[i].destroy();
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
                    bufferArray.fill(null);
                    streams.fill(null);
                    bufferArray = null;
                    streams = null;
                    return true;
                };
                const errorHandler = function (err) {
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
                    let str = null, buffer = null;
                    try {
                        if (response.statusCode >= 300 && response.statusCode <= 399 && response.headers.location) {
                            if (redirCount >= 10) {
                                errorHandler(new Error("Too many redirects! Last redirected address: " + response.headers.location));
                            }
                            else {
                                const u = new url_1.URL(response.headers.location, url);
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
                    }
                    catch (e) {
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
                    }
                    else if (jsonResponse) {
                        try {
                            resolve({
                                success: (response.statusCode >= 200 && response.statusCode <= 299),
                                parseSuccess: true,
                                statusCode: response.statusCode,
                                headers: response.headers,
                                result: (str ? JSON.parse(str) : null)
                            });
                        }
                        catch (e) {
                            resolve({
                                success: false,
                                parseSuccess: false,
                                statusCode: response.statusCode,
                                headers: response.headers,
                                result: str
                            });
                        }
                    }
                    else {
                        resolve({
                            success: (response.statusCode >= 200 && response.statusCode <= 299),
                            statusCode: response.statusCode,
                            headers: response.headers,
                            result: str
                        });
                    }
                    cleanUp();
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
class JSONRequest {
    static async delete(url, headers) {
        return send("DELETE", url, null, null, null, true, false, headers, 0);
    }
    static async deleteObject(url, object, headers) {
        return send("DELETE", url, JSON.stringify(object), null, null, true, false, headers, 0);
    }
    static async deleteBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("DELETE", url, null, body, contentType, true, false, headers, 0);
    }
    static async get(url, headers) {
        return send("GET", url, null, null, null, true, false, headers, 0);
    }
    static async patch(url, object, headers) {
        return send("PATCH", url, JSON.stringify(object), null, null, true, false, headers, 0);
    }
    static async patchBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("PATCH", url, null, body, contentType, true, false, headers, 0);
    }
    static async post(url, object, headers) {
        return send("POST", url, JSON.stringify(object), null, null, true, false, headers, 0);
    }
    static async postBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("POST", url, null, body, contentType, true, false, headers, 0);
    }
    static async put(url, object, headers) {
        return send("PUT", url, JSON.stringify(object), null, null, true, false, headers, 0);
    }
    static async putBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("PUT", url, null, body, contentType, true, false, headers, 0);
    }
}
exports.JSONRequest = JSONRequest;
class StringRequest {
    static async delete(url, headers) {
        return send("DELETE", url, null, null, null, false, false, headers, 0);
    }
    static async deleteObject(url, object, headers) {
        return send("DELETE", url, JSON.stringify(object), null, null, false, false, headers, 0);
    }
    static async deleteBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("DELETE", url, null, body, contentType, false, false, headers, 0);
    }
    static async get(url, headers) {
        return send("GET", url, null, null, null, false, false, headers, 0);
    }
    static async patch(url, object, headers) {
        return send("PATCH", url, JSON.stringify(object), null, null, false, false, headers, 0);
    }
    static async patchBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("PATCH", url, null, body, contentType, false, false, headers, 0);
    }
    static async post(url, object, headers) {
        return send("POST", url, JSON.stringify(object), null, null, false, false, headers, 0);
    }
    static async postBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("POST", url, null, body, contentType, false, false, headers, 0);
    }
    static async put(url, object, headers) {
        return send("PUT", url, JSON.stringify(object), null, null, false, false, headers, 0);
    }
    static async putBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("PUT", url, null, body, contentType, false, false, headers, 0);
    }
}
exports.StringRequest = StringRequest;
class BufferRequest {
    static async delete(url, headers) {
        return send("DELETE", url, null, null, null, false, true, headers, 0);
    }
    static async deleteObject(url, object, headers) {
        return send("DELETE", url, JSON.stringify(object), null, null, false, true, headers, 0);
    }
    static async deleteBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("DELETE", url, null, body, contentType, false, true, headers, 0);
    }
    static async get(url, headers) {
        return send("GET", url, null, null, null, false, true, headers, 0);
    }
    static async patch(url, object, headers) {
        return send("PATCH", url, JSON.stringify(object), null, null, false, true, headers, 0);
    }
    static async patchBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("PATCH", url, null, body, contentType, false, true, headers, 0);
    }
    static async post(url, object, headers) {
        return send("POST", url, JSON.stringify(object), null, null, false, true, headers, 0);
    }
    static async postBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("POST", url, null, body, contentType, false, true, headers, 0);
    }
    static async put(url, object, headers) {
        return send("PUT", url, JSON.stringify(object), null, null, false, true, headers, 0);
    }
    static async putBuffer(url, body, contentType, headers) {
        if (!body)
            throw new Error("Invalid body");
        if (!contentType)
            throw new Error("Invalid contentType");
        return send("PUT", url, null, body, contentType, false, true, headers, 0);
    }
}
exports.BufferRequest = BufferRequest;

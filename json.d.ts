/// <reference types="node" />
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
export declare class JSONRequest {
    private static send;
    static delete(url: string, headers?: any): Promise<JSONResponse>;
    static deleteBody(url: string, jsonBody: string, headers?: any): Promise<JSONResponse>;
    static deleteBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse>;
    static get(url: string, headers?: any): Promise<JSONResponse>;
    static patch(url: string, jsonBody: string, headers?: any): Promise<JSONResponse>;
    static patchBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse>;
    static post(url: string, jsonBody: string, headers?: any): Promise<JSONResponse>;
    static postBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse>;
    static put(url: string, jsonBody: string, headers?: any): Promise<JSONResponse>;
    static putBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse>;
}

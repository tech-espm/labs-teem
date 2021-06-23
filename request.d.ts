/// <reference types="node" />
import http = require("http");
import { URL } from "url";
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
export declare class JSONRequest {
	static delete(url: string | URL, options?: RequestOptions): Promise<JSONResponse>;
	static deleteBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<JSONResponse>;
	static deleteObject(url: string | URL, object: any, options?: RequestOptions): Promise<JSONResponse>;
	static get(url: string | URL, options?: RequestOptions): Promise<JSONResponse>;
	static patchBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<JSONResponse>;
	static patchObject(url: string | URL, object: any, options?: RequestOptions): Promise<JSONResponse>;
	static postBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<JSONResponse>;
	static postObject(url: string | URL, object: any, options?: RequestOptions): Promise<JSONResponse>;
	static putBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<JSONResponse>;
	static putObject(url: string | URL, object: any, options?: RequestOptions): Promise<JSONResponse>;
}
export declare class StringRequest {
	static delete(url: string | URL, options?: RequestOptions): Promise<StringResponse>;
	static deleteBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<StringResponse>;
	static deleteObject(url: string | URL, object: any, options?: RequestOptions): Promise<StringResponse>;
	static get(url: string | URL, options?: RequestOptions): Promise<StringResponse>;
	static patchBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<StringResponse>;
	static patchObject(url: string | URL, object: any, options?: RequestOptions): Promise<StringResponse>;
	static postBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<StringResponse>;
	static postObject(url: string | URL, object: any, options?: RequestOptions): Promise<StringResponse>;
	static putBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<StringResponse>;
	static putObject(url: string | URL, object: any, options?: RequestOptions): Promise<StringResponse>;
}
export declare class BufferRequest {
	static delete(url: string | URL, options?: RequestOptions): Promise<BufferResponse>;
	static deleteBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<BufferResponse>;
	static deleteObject(url: string | URL, object: any, options?: RequestOptions): Promise<BufferResponse>;
	static get(url: string | URL, options?: RequestOptions): Promise<BufferResponse>;
	static patchBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<BufferResponse>;
	static patchObject(url: string | URL, object: any, options?: RequestOptions): Promise<BufferResponse>;
	static postBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<BufferResponse>;
	static postObject(url: string | URL, object: any, options?: RequestOptions): Promise<BufferResponse>;
	static putBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<BufferResponse>;
	static putObject(url: string | URL, object: any, options?: RequestOptions): Promise<BufferResponse>;
}

/// <reference types="node" />
import http = require("http");
import { URL } from "url";
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
	static delete(url: string | URL, headers?: any): Promise<JSONResponse>;
	static deleteBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse>;
	static deleteObject(url: string | URL, object: any, headers?: any): Promise<JSONResponse>;
	static get(url: string | URL, headers?: any): Promise<JSONResponse>;
	static patchBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse>;
	static patchObject(url: string | URL, object: any, headers?: any): Promise<JSONResponse>;
	static postBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse>;
	static postObject(url: string | URL, object: any, headers?: any): Promise<JSONResponse>;
	static putBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<JSONResponse>;
	static putObject(url: string | URL, object: any, headers?: any): Promise<JSONResponse>;
}
export declare class StringRequest {
	static delete(url: string | URL, headers?: any): Promise<StringResponse>;
	static deleteBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<StringResponse>;
	static deleteObject(url: string | URL, object: any, headers?: any): Promise<StringResponse>;
	static get(url: string | URL, headers?: any): Promise<StringResponse>;
	static patchBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<StringResponse>;
	static patchObject(url: string | URL, object: any, headers?: any): Promise<StringResponse>;
	static postBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<StringResponse>;
	static postObject(url: string | URL, object: any, headers?: any): Promise<StringResponse>;
	static putBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<StringResponse>;
	static putObject(url: string | URL, object: any, headers?: any): Promise<StringResponse>;
}
export declare class BufferRequest {
	static delete(url: string | URL, headers?: any): Promise<BufferResponse>;
	static deleteBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<BufferResponse>;
	static deleteObject(url: string | URL, object: any, headers?: any): Promise<BufferResponse>;
	static get(url: string | URL, headers?: any): Promise<BufferResponse>;
	static patchBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<BufferResponse>;
	static patchObject(url: string | URL, object: any, headers?: any): Promise<BufferResponse>;
	static postBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<BufferResponse>;
	static postObject(url: string | URL, object: any, headers?: any): Promise<BufferResponse>;
	static putBuffer(url: string | URL, body: Buffer, contentType: string, headers?: any): Promise<BufferResponse>;
	static putObject(url: string | URL, object: any, headers?: any): Promise<BufferResponse>;
}

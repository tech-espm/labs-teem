import express = require("express");
import fs = require("fs");
import path = require("path");
import FS = require("./fileSystem");
import { JSONResponse, JSONRequest as JSONReq } from "./json";

import type { PoolConfig } from "mysql";
import type { ServeStaticOptions } from "serve-static";
import type { SqlInterface } from "./sql";

namespace app {
	// We are exporting these interfaces here in order to try to help
	// the users, avoiding having them do require("express"), or even
	// import type { ... } from "express", just to reference the types
	// express.Request, express.Response and express.NextFunction in
	// their routes' methods.
	export interface Request extends express.Request {
	}

	export interface Response extends express.Response {
	}

	export interface NextFunction extends express.NextFunction {
	}

	export interface Sql extends SqlInterface {
	}
}

// Public Interfaces

// @@@ Doc
interface FileSystem {
	absolutePath(projectRelativePath: string): string;
	validateUploadedFilename(filename: string): string;
	createDirectory(projectRelativePath: string, options?: fs.Mode | fs.MakeDirectoryOptions): Promise<void>;
	deleteDirectory(projectRelativePath: string): Promise<void>;
	deleteFilesAndDirectory(projectRelativePath: string): Promise<void>;
	renameFile(currentProjectRelativePath: string, newProjectRelativePath: string): Promise<void>;
	deleteFile(projectRelativePath: string): Promise<void>;
	fileExists(projectRelativePath: string): Promise<boolean>;
	createNewEmptyFile(projectRelativePath: string, mode?: fs.Mode): Promise<void>;
	saveBuffer(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
	saveText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
	saveBufferToNewFile(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
	saveTextToNewFile(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
	appendBuffer(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
	appendText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
	appendBufferToExistingFile(projectRelativePath: string, buffer: Buffer): Promise<void>;
	appendTextToExistingFile(projectRelativePath: string, text: string, encoding?: BufferEncoding): Promise<void>;
}

// @@@ Doc
interface JSONRequest {
	get(url: string, headers?: any): Promise<JSONResponse>;
	delete(url: string, headers?: any): Promise<JSONResponse>;
	post(url: string, jsonBody: string, headers?: any): Promise<JSONResponse>;
	put(url: string, jsonBody: string, headers?: any): Promise<JSONResponse>;
}

interface Sql {
    /**
     * Fetches a connection from the internal connection pool and executes the given callback upon success. The actual connection is provided as the first argument to the callback.
     * 
	 * This operation is asynchronous, and must be handled inside a callback to make sure the connection does not leak, as the framework always releases the connection when the callback exits.
	 * 
	 * Also, using the connection inside the callback allows for a proper cleanup in several scenarios, such as when an unhandled exception occurs and there is an open transaction, in which case `rollback()` is automatically called by the framework.
	 * 
	 * For example:
	 * 
	 * ```ts
	 * class A {
	 *     public async method(): Promise<void> {
	 *         await app.sql.connect(async (sql) => {
	 *             ...
	 *             await sql.query("INSERT INTO ...");
	 *             ...
	 *         });
	 *     }
	 * }
	 * ```
	 * 
	 * `app.sql.connect()` returns whatever the callback returns. For example:
	 * 
	 * ```ts
	 * class A {
	 *     public async method(): Promise<void> {
	 *         const x = await app.sql.connect(async (sql) => {
	 *             ...
	 *             return 123;
	 *         });
	 * 
	 *         // Outputs 123 to the console.
	 *         console.log(x);
	 *     }
	 * }
	 * ```
     * @param callback Function to be executed when a connection is successfully fetched from the pool.
     */
	connect<T>(callback: (sql: app.Sql) => Promise<T>): Promise<T>;
}

interface ErrorHandler {
	(err: any, req: app.Request, res: app.Response, next: app.NextFunction): Promise<void> | void;
}

interface Config {
	root?: string;
	localIp?: string;
	port?: number;

	sqlConfig?: PoolConfig;

	disableCompression?: boolean;
	disableStaticFiles?: boolean;
	disableViews?: boolean;
	disableRoutes?: boolean;
	disableCookies?: boolean;
	disablePostBodyParser?: boolean;
	disableNoCacheHeader?: boolean;

	projectDir?: string;
	mainModuleDir?: string;
	staticFilesDir?: string;
	viewsDir?: string;
	routesDir?: string[];

	staticFilesConfig?: ServeStaticOptions;
	viewsCacheSize?: number;
	logRoutesToConsole?: boolean;
	useClassNamesAsRoutes?: boolean;
	allMethodsRoutesAllByDefault?: boolean;
	allMethodsRoutesHiddenByDefault?: boolean;

	preInitCallback?: () => void;
	preRouteCallback?: () => void;
	postRouteCallback?: () => void;
	listenCallback?: () => void;

	errorHandler?: ErrorHandler;
	htmlErrorHandler?: ErrorHandler;

	setupOnly?: boolean;
}

// Private Interfaces and Functions

/** @internal */
interface ValidHttpMethods {
	[methodName: string]: boolean;
}

/** @internal */
interface InternalRoute {
	absolutePath: string;
	route: string;
	httpMethod: string;
	routeMiddleware: any[];
	boundUserHandler: Function;
}

/** @internal */
function httpGeneric(method: string): MethodDecorator {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const f = (target[propertyKey] || target);
		if (!f["httpMethods"])
			f["httpMethods"] = [];
		f["httpMethods"].push(method);
	};
}

/** @internal */
function extractCallingFile(): string {
	// https://github.com/v8/v8/wiki/Stack%20Trace%20API#customizing-stack-traces
	// https://v8.dev/docs/stack-trace-api#customizing-stack-traces
	const prepareStackTrace = Error.prepareStackTrace;
	Error.prepareStackTrace = function (err, stackTraces): NodeJS.CallSite[] { return stackTraces; };
	// For efficiency stack traces are not formatted when they are captured but on demand,
	// the first time the stack property is accessed. A stack trace is formatted by calling
	// Error.prepareStackTrace(error, structuredStackTrace)
	const stack = ((new Error()).stack as any) as NodeJS.CallSite[];
	Error.prepareStackTrace = prepareStackTrace;
	// Try to skip the call to this function and to the function that called this one.
	return stack[Math.min(stack.length, 3) - 1].getFileName();
}

/** @internal */
function extractRoutesFromObject(config: Config, validHttpMethods: ValidHttpMethods, prefix: string, routes: InternalRoute[], absolutePath: string, obj: any, thisArg: any): void {
	const names = Object.getOwnPropertyNames(obj);

	for (let i = names.length - 1; i >= 0; i--) {
		const n = names[i];

		if (!n || n === "constructor")
			continue;

		const f = obj[n] as Function;
		if (f && (typeof f) === "function") {
			let fullMethodRoute = f["routeFullMethodRoute"] as string,
				routeMethodName = f["routeMethodName"] as string,
				httpMethods = f["httpMethods"] as string[];
			const httpHidden = f["httpHidden"],
				routeMiddleware = f["routeMiddleware"] as any[];

			delete f["routeFullMethodRoute"];
			delete f["routeMethodName"];
			delete f["httpMethods"];
			delete f["httpHidden"];
			delete f["routeMiddleware"];

			if (httpHidden || (config.allMethodsRoutesHiddenByDefault && (!httpMethods || !httpMethods.length)))
				continue;

			if (f.length > 3)
				throw new Error(`Function "${f.name}", in file ${absolutePath}, should have 3 parameters at most`);

			if (fullMethodRoute) {
				if (!fullMethodRoute.startsWith("/"))
					fullMethodRoute = "/" + fullMethodRoute;
			} else {
				if (!routeMethodName && routeMethodName !== "")
					routeMethodName = n;
				if (routeMethodName.startsWith("/"))
					routeMethodName = routeMethodName.substr(1);
				if (routeMethodName.toLowerCase() === "index")
					routeMethodName = "";
				if (routeMethodName)
					fullMethodRoute = prefix + routeMethodName;
				else
					fullMethodRoute = prefix;
			}

			if (fullMethodRoute.length > 1 && fullMethodRoute.endsWith("/"))
				fullMethodRoute = fullMethodRoute.substr(0, fullMethodRoute.length - 1);

			if (!httpMethods || !httpMethods.length) {
				routes.push({
					absolutePath,
					route: fullMethodRoute,
					httpMethod: (config.allMethodsRoutesAllByDefault ? "all" : "get"),
					routeMiddleware,
					boundUserHandler: f.bind(thisArg)
				});
			} else {
				httpMethods.sort();
				let all = false;
				for (let m = httpMethods.length - 1; m > 0; m--) {
					if (httpMethods[m] === httpMethods[m - 1])
						httpMethods.splice(m, 1);
					else if (!validHttpMethods[httpMethods[m]])
						throw new Error(`Invalid http method "${httpMethods[m]}" used for the class method "${n}" in file ${absolutePath}`);
					else if (httpMethods[m] === "all")
						all = true;
				}

				if (!validHttpMethods[httpMethods[0]])
					throw new Error(`Invalid http method "${httpMethods[0]}" used for the class method "${n}" in file ${absolutePath}`);
				else if (httpMethods[0] === "all")
					all = true;

				if (all) {
					routes.push({
						absolutePath,
						route: fullMethodRoute,
						httpMethod: "all",
						routeMiddleware,
						boundUserHandler: f.bind(thisArg)
					});
				} else {
					const boundUserHandler = f.bind(thisArg);

					for (let m = httpMethods.length - 1; m >= 0; m--)
						routes.push({
							absolutePath,
							route: fullMethodRoute,
							httpMethod: httpMethods[m],
							routeMiddleware,
							boundUserHandler
						});
				}
			}
		}
	}

	const proto = Object.getPrototypeOf(obj);
	if (proto !== Function.prototype && proto !== Object.prototype)
		extractRoutesFromObject(config, validHttpMethods, prefix, routes, absolutePath, proto, thisArg);
}

/** @internal */
function extractRoutesFromFunctionOrObject(config: Config, validHttpMethods: ValidHttpMethods, prefix: string, routes: InternalRoute[], absolutePath: string, name: string, f: any): void {
	if (("routeFullClassRoute" in f)) {
		prefix = f["routeFullClassRoute"];
		if (!prefix) {
			prefix = "/";
		} else {
			if (!prefix.startsWith("/"))
				prefix = "/" + prefix;
			if (!prefix.endsWith("/"))
				prefix += "/";
		}
	} else {
		if (("routeClassName" in f))
			name = f["routeClassName"];
		else if (config.useClassNamesAsRoutes && ((typeof f) === "function" && f.name))
			name = f.name;

		if (name) {
			if (name.startsWith("/"))
				name = name.substr(1);
			if (!name.endsWith("/"))
				name += "/";
			if (name.length > 1 && name.toLowerCase() !== "index/")
				prefix += name;
		}
	}

	delete f["routeFullClassRoute"];
	delete f["routeClassName"];

	// Static methods or object functions
	extractRoutesFromObject(config, validHttpMethods, prefix, routes, absolutePath, f, f);

	if ((typeof f) === "function") {
		// Instance methods
		const i = new f();
		extractRoutesFromObject(config, validHttpMethods, prefix, routes, absolutePath, i, i);
	}
}

/** @internal */
function extractRoutesFromFile(config: Config, validHttpMethods: ValidHttpMethods, prefix: string, routes: InternalRoute[], absolutePath: string, name: string): void {
	const r = require(absolutePath);
	if (!r)
		throw new Error(`File ${absolutePath} does not export a valid object/class/function`);

	switch (typeof r) {
		case "object":
			// Plain object or ES module
			let s: symbol[];
			if (r.__esModule || ((s = Object.getOwnPropertySymbols(r)) && s.length && s[0] && r[s[0]] === "Module")) {
				for (let n in r) {
					const f = r[n];
					if (f && (typeof f) === "function")
						extractRoutesFromFunctionOrObject(config, validHttpMethods, prefix, routes, absolutePath, name, f);
				}
			} else {
				extractRoutesFromFunctionOrObject(config, validHttpMethods, prefix, routes, absolutePath, name, r);
			}
			break;
		case "function":
			// Class or function + prototype
			extractRoutesFromFunctionOrObject(config, validHttpMethods, prefix, routes, absolutePath, name, r);
			break;
		default:
			throw new Error(`File ${absolutePath} exports a value of type ${(typeof r)} which is not supported`);
	}
}

/** @internal */
function extractRoutesFromDir(config: Config, validHttpMethods: ValidHttpMethods, prefix: string, routes: InternalRoute[], dir: string): void {
	const names = fs.readdirSync(dir);

	if (!names)
		return;

	for (let i = names.length - 1; i >= 0; i--) {
		const name = names[i];
		let absolutePath: string;
		if (name.toLowerCase().endsWith(".js") && !fs.statSync(absolutePath = path.join(dir, name)).isDirectory()) {
			extractRoutesFromFile(config, validHttpMethods, prefix, routes, absolutePath, name.substr(0, name.length - 3));
			names.splice(i, 1);
		}
	}

	for (let i = names.length - 1; i >= 0; i--) {
		const name = names[i], absolutePath = path.join(dir, name);
		if (fs.statSync(absolutePath).isDirectory())
			extractRoutesFromDir(config, validHttpMethods, prefix + name + "/", routes, absolutePath);
	}
}

// I tested the five techniques below in Node 12, and the resulting
// performance was almost the same for all of them...
//
//function createHandlerApply(userHandler: Function, thisArg: any): Function {
//	return function() {
//		const r = userHandler.apply(thisArg, arguments);
//		if (r)
//			Promise.resolve(r).catch(arguments[arguments.length - 1]);
//	};
//}
//
//function createHandlerBindApply(userHandler: Function, thisArg: any): Function {
//	const boundUserHandler = userHandler.bind(thisArg);
//	return function() {
//		// I know this is an overkill, because bind() already sets "this" for the function...
//		// But, I created this just for the sake of test completeness.
//		const r = boundUserHandler.apply(thisArg, arguments);
//		if (r)
//			Promise.resolve(r).catch(arguments[arguments.length - 1]);
//	};
//}
//
//function createHandlerCall(userHandler: Function, thisArg: any): Function {
//	return function(...args: any[]) {
//		const r = userHandler.call(thisArg, ...args);
//		if (r)
//			Promise.resolve(r).catch(arguments[arguments.length - 1]);
//	};
//}
//
//function createHandlerBindCall(userHandler: Function, thisArg: any): Function {
//	const boundUserHandler = userHandler.bind(thisArg);
//	return function(...args: any[]) {
//		// I know this is an overkill, because bind() already sets "this" for the function...
//		// But, I created this just for the sake of test completeness.
//		const r = boundUserHandler.call(thisArg, ...args);
//		if (r)
//			Promise.resolve(r).catch(arguments[arguments.length - 1]);
//	};
//}
//
//function createHandlerBindArgs(userHandler: Function, thisArg: any): Function {
//	const boundUserHandler = userHandler.bind(thisArg);
//	return function(...args: any[]) {
//		const r = boundUserHandler(...args);
//		if (r)
//			Promise.resolve(r).catch(arguments[arguments.length - 1]);
//	};
//}

/** @internal */
function createRegularHandler(boundUserHandler: Function): Function {
	// Express.js checks the handler's length to determine if it is a regular handler,
	// or an error handler. For a handler to be considered an error handler, it
	// must at most 3 parameters.
	return function(req: express.Request, res: express.Response, next: express.NextFunction) {
		const r = boundUserHandler(req, res, next);
		if (r)
			Promise.resolve(r).catch(next);
	};
}

function createErrorHandler(boundUserHandler: ErrorHandler): ErrorHandler {
	// Express.js checks the handler's length to determine if it is a regular handler,
	// or an error handler. For a handler to be considered an error handler, it
	// must have 4 parameters.
	return function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
		const r = boundUserHandler(err, req, res, next);
		if (r)
			Promise.resolve(r).catch(next);
	};
}

/** @internal */
function registerRoutes(appExpress: express.Express, routes: InternalRoute[]): void {
	for (let i = 0; i < routes.length; i++) {
		const route = routes[i];

		if (route.routeMiddleware && route.routeMiddleware.length) {
			const m = appExpress[route.httpMethod],
				args = [route.route] as any[];

			args.push.apply(args, route.routeMiddleware);
			args.push(createRegularHandler(route.boundUserHandler));

			m.apply(m, args);
		} else {
			appExpress[route.httpMethod](route.route, createRegularHandler(route.boundUserHandler));
		}
	}
}

// Private Middlewares

/** @internal */
function removeCacheHeader(req: express.Request, res: express.Response, next: express.NextFunction): void {
	res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
	res.header("Expires", "-1");
	res.header("Pragma", "no-cache");
	next();
}

/** @internal */
function notFoundHandler(req: express.Request, res: express.Response, next: express.NextFunction): void {
	next({
		message: "Not found",
		status: 404
	});
}

/** @internal */
function errorHandlerWithCustomHtmlError(err: any, req: express.Request, res: express.Response, next: express.NextFunction): void {
	err.status = (parseInt(err.status) || 500);
	res.status(err.status);

	if (req.path.indexOf("/api/") >= 0 || (req.headers.accept && req.headers.accept.indexOf("application/json") >= 0))
		res.json(err.message || (err.status === 404 ? "Not found" : "Internal error"));
	else
		htmlErrorHandler(err, req, res, next);
}

/** @internal */
function errorHandlerWithoutCustomHtmlError(err: any, req: express.Request, res: express.Response, next: express.NextFunction): void {
	err.status = (parseInt(err.status) || 500);
	res.status(err.status);

	if (req.path.indexOf("/api/") >= 0 || (req.headers.accept && req.headers.accept.indexOf("application/json") >= 0))
		res.json(err.message || (err.status === 404 ? "Not found" : "Internal error"));
	else
		res.contentType("text/plain").send(err.message || (err.status === 404 ? "Not found" : "Internal error"));
}

/** @internal */
let htmlErrorHandler: ErrorHandler = null;

const app = {
	// Route Decorators

	/**
	 * Decorators used to map class/method routes.
	 * 
	 * As of TypeScript 4.0.5, decorators must be enabled in `tsconfig.json` in order to be used:
	 * 
	 * ```json
	 * {
	 *     "compilerOptions": {
	 *         ...
	 *         "experimentalDecorators": true
	 *     }
	 * }
	 * ```
	 * 
	 * Refer to https://www.typescriptlang.org/docs/handbook/decorators.html for more information on decorators.
	 */
	route: {
		/**
		 * Specifies the full path to be used to prefix the routes created by the class' methods.
		 * 
		 * If this decorator is not used, the concatenation of current file's directory (relative to `app.dir.routes`) + name is used as the prefix.
		 * 
		 * For example, assume `app.dir.routes = ["/path/to/project/routes"]` and the class below is in the file `/path/to/project/routes/api/sales/order.js`.
		 * 
		 * ```ts
		 * class Order {
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * By default, method `Order.m1()` produces the route `/api/sales/order/m1` (or `/api/sales/Order/m1` if the setting `config.useClassNamesAsRoutes` is `true`).
		 * 
		 * But if the decorator `@app.route.fullClassRoute("/my/custom/route")` were used, as in the example below, method `Order.m1()` would produce the route `/my/custom/route/m1`.
		 * 
		 * ```ts
		 * '@'app.route.fullClassRoute("/my/custom/route")
		 * class Order {
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 * 
		 * Express.js's route parameters can be used (refer to http://expressjs.com/en/guide/routing.html for more information on that).
		 * 
		 * When in doubt, set `config.logRoutesToConsole` to `true` to list all the routes produced during setup.
		 * @param routeFullClassRoute Full path to be used to prefix the routes created by the class' methods.
		 */
		fullClassRoute: function (routeFullClassRoute: string): ClassDecorator { return function (constructor: Function) { constructor["routeFullClassRoute"] = routeFullClassRoute; }; },

		/**
		 * Specifies the full path to be used as the method's route, overriding everything else.
		 * 
		 * If this decorator is not used, the concatenation of current class' route prefix + the method name is used as the route.
		 * 
		 * For example, assume `app.dir.routes = ["/path/to/project/routes"]` and the class below is in the file `/path/to/project/routes/api/sales/order.js`.
		 * 
		 * ```ts
		 * class Order {
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * By default, method `Order.m1()` produces the route `/api/sales/order/m1` (or `/api/sales/Order/m1` if the setting `config.useClassNamesAsRoutes` is `true`).
		 * 
		 * But if the decorator `@app.route.fullMethodRoute("/my/custom/method/route")` were used, as in the example below, method `Order.m1()` would produce the route `/my/custom/method/route`.
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.route.fullMethodRoute("/my/custom/method/route")
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 * 
		 * Express.js's route parameters can be used (refer to http://expressjs.com/en/guide/routing.html for more information on that).
		 * 
		 * When in doubt, set `config.logRoutesToConsole` to `true` to list all the routes produced during setup.
		 * @param routeFullMethodRoute Full path to be used as the method's route.
		 */
		fullMethodRoute: function (routeFullMethodRoute: string): MethodDecorator { return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) { (target[propertyKey] || target)["routeFullMethodRoute"] = routeFullMethodRoute; }; },

		/**
		 * Specifies the name to be used when composing the class' route prefix.
		 * 
		 * If this decorator is not used, either the actual name of the class or the current file name is used to create the class' route prefix (depending on the setting `config.useClassNamesAsRoutes`).
		 * 
		 * For example, assume `app.dir.routes = ["/path/to/project/routes"]` and the class below is in the file `/path/to/project/routes/api/sales/order.js`.
		 * 
		 * ```ts
		 * class Order {
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * By default, method `Order.m1()` produces the route `/api/sales/order/m1` (or `/api/sales/Order/m1` if the setting `config.useClassNamesAsRoutes` is `true`).
		 * 
		 * But if the decorator `@app.route.className("newName")` were used, as in the example below, method `Order.m1()` would produce the route `/api/sales/newName/m1` (ignoring the setting `config.useClassNamesAsRoutes`).
		 * 
		 * ```ts
		 * '@'app.route.className("newName")
		 * class Order {
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 * 
		 * The decorator `@app.route.fullClassRoute` overrides this one.
		 * 
		 * Express.js's route parameters can be used (refer to http://expressjs.com/en/guide/routing.html for more information on that).
		 * 
		 * When in doubt, set `config.logRoutesToConsole` to `true` to list all the routes produced during setup.
		 * @param routeClassName Name to be used when composing the class' route prefix.
		 */
		className: function (routeClassName: string): ClassDecorator { return function (constructor: Function) { constructor["routeClassName"] = routeClassName; }; },

		/**
		 * Specifies the name to be used when composing the method's route.
		 * 
		 * If this decorator is not used, the actual method's name is used to create route.
		 * 
		 * For example, assume `app.dir.routes = ["/path/to/project/routes"]` and the class below is in the file `/path/to/project/routes/api/sales/order.js`.
		 * 
		 * ```ts
		 * class Order {
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * By default, method `Order.m1()` produces the route `/api/sales/order/m1` (or `/api/sales/Order/m1` if the setting `config.useClassNamesAsRoutes` is `true`).
		 * 
		 * But if the decorator `@app.route.methodName("myMethod")` were used, as in the example below, method `Order.m1()` would produce the route `/api/sales/order/myMethod` (or `/api/sales/Order/myMethod` if the setting `config.useClassNamesAsRoutes` is `true` or `xxx/myMethod` if either decorator `@app.route.fullClassRoute()` or decorator `@app.route.className()` is used on class `Order`).
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.route.methodName("myMethod")
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 * 
		 * The decorator `@app.route.fullMethodRoute` overrides this one.
		 * 
		 * Express.js's route parameters can be used (refer to http://expressjs.com/en/guide/routing.html for more information on that).
		 * 
		 * When in doubt, set `config.logRoutesToConsole` to `true` to list all the routes produced during setup.
		 * @param routeClassName Name to be used when composing the class' route prefix.
		 */
		methodName: function (routeMethodName: string): MethodDecorator { return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) { (target[propertyKey] || target)["routeMethodName"] = routeMethodName; }; },

		middleware: function (...middleware: any[]): MethodDecorator { return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) { const f = (target[propertyKey] || target); f["routeMiddleware"] = middleware; }; }
	},

	/**
	 * Decorators used to specify which HTTP methods a class' method accepts.
	 * 
	 * As of TypeScript 4.0.5, decorators must be enabled in `tsconfig.json` in order to be used:
	 * 
	 * ```json
	 * {
	 *     "compilerOptions": {
	 *         ...
	 *         "experimentalDecorators": true
	 *     }
	 * }
	 * ```
	 * 
	 * Refer to https://www.typescriptlang.org/docs/handbook/decorators.html for more information on decorators.
	 */
	http: {
		/**
		 * Informs the class' method accepts all HTTP methods.
		 * 
		 * For example:
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.http.all()
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 */
		all: function (): MethodDecorator { return httpGeneric("all"); },

		/**
		 * Informs the class' method accepts the HTTP method GET (can be used with any other `app.http` method decorator).
		 * 
		 * For example:
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.http.get()
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 */
		get: function (): MethodDecorator { return httpGeneric("get"); },

		/**
		 * Informs the class' method accepts the HTTP method POST (can be used with any other `app.http` method decorator).
		 * 
		 * For example:
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.http.post()
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 */
		post: function (): MethodDecorator { return httpGeneric("post"); },

		/**
		 * Informs the class' method accepts the HTTP method PUT (can be used with any other `app.http` method decorator).
		 * 
		 * For example:
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.http.put()
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 */
		put: function (): MethodDecorator { return httpGeneric("put"); },

		/**
		 * Informs the class' method accepts the HTTP method DELETE (can be used with any other `app.http` method decorator).
		 * 
		 * For example:
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.http.delete()
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 */
		delete: function (): MethodDecorator { return httpGeneric("delete"); },

		/**
		 * Informs the class' method accepts the HTTP method PATCH (can be used with any other `app.http` method decorator).
		 * 
		 * For example:
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.http.patch()
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 */
		patch: function (): MethodDecorator { return httpGeneric("patch"); },

		/**
		 * Informs the class' method accepts the HTTP method OPTIONS (can be used with any other `app.http` method decorator).
		 * 
		 * For example:
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.http.options()
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 */
		options: function (): MethodDecorator { return httpGeneric("options"); },

		/**
		 * Informs the class' method accepts the HTTP method HEAD (can be used with any other `app.http` method decorator).
		 * 
		 * For example:
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.http.head()
		 *     public m1(req: app.Request, res: app.Response): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 */
		head: function (): MethodDecorator { return httpGeneric("head"); },

		/**
		 * Informs the class' method accepts no HTTP methods at all (effectively not producing a route).
		 * 
		 * This decorator overrides all other `app.http` and `app.route` decorators.
		 * 
		 * For example:
		 * 
		 * ```ts
		 * class Order {
		 *     '@'app.http.hidden()
		 *     public m1(): void {
		 *         ...
		 *     }
		 * }
		 * ```
		 * 
		 * The @ character MUST NOT be placed between '' in the actual code.
		 */
		hidden: function (): MethodDecorator { return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) { (target[propertyKey] || target)["httpHidden"] = true; }; }
	},

	// Properties

	/**
	 * The root path where this app is located in the actual server, in case the server hosts several apps in a single domain.
	 * 
	 * For example, if the app is the only one hosted by the server, and is located at the root URL, such as `example.com`, `app.root` is an empty string `""`.
	 * 
	 * If the app is hosted by the server alongside other apps, such as `example.com/app1`, app.root is `"/app1"`.
	 * 
	 * `app.root` is NOT automatically set and its value comes from `config.root`. If a value is not provided in `config.root`, the empty string `""` is used.
	 * 
	 * If the value in `app.root` is anything other than the empty string `""`, it is adjusted so that is always starts with a `/` character, and never ends with with a `/` character.
	 * 
	 * `app.root` can be used in redirections, such as `res.redirect(app.root + "/new/route")`.
	 * 
	 * `app.root` can also be used in EJS files, since `app.root` is replicated to `app.express.locals.root`, allowing for constructs like `<a href="<%- root %>/path/to/something">`.
	 * 
	 * `app.root` is NOT used to produce the routes.
	 */
	root: null as string,

	/**
	 * The IP address used when setting up the server.
	 * 
	 * If a value is not provided in `config.localIp`, `127.0.0.1` is used.
	 */
	localIp: null as string,

	/**
	 * The TCP port used when setting up the server.
	 * 
	 * If a value is not provided in `config.port`, `3000` is used.
	 */
	port: 0,

	/**
	 * Important paths used by the framework.
	 */
	dir: {
		/**
		 * The initial working directory, obtained by calling `process.cwd()` at the beginning of the setup process.
		 */
		initial: null as string,

		/**
		 * The directory where the main app's module is located.
		 * 
		 * If a value is not provided in `config.mainModuleDir`, the directory of the module calling `app.run()` is used.
		 * 
		 * Using `require.main.path` does not work on some cloud providers, because they perform additional requires of their own before actually executing the app's main file (like `app.js`, `server.js` or `index.js`).
		 * 
		 * `app.dir.mainModule` is used as `app.dir.routes`'s base directory when `config.routesDir` is not provided.
		 */
		mainModule: null as string,

		/**
		 * The app's "project" directory.
		 * 
		 * If a value is not provided in `config.projectDir`, `app.dir.initial` is used.
		 * 
		 * `app.dir.project` is used as `app.dir.staticFiles`'s and `app.dir.views`'s base directory when `config.staticFilesDir` / `config.viewsDir` are not provided.
		 * 
		 * `app.dir.project` is also used as the base directory for all `app.fileSystem` methods.
		 */
		project: null as string,

		/**
		 * The app's static files directory.
		 * 
		 * If a value is not provided in `config.staticFilesDir`, `app.dir.project + "/public"` is used.
		 * 
		 * If `config.disableStaticFiles` is `true`, `app.dir.staticFiles` is `null` and static file handling is not automatically configured.
		 */
		staticFiles: null as string,

		/**
		 * The app's views directory.
		 * 
		 * If a value is not provided in `config.viewsDir`, `app.dir.project + "/views"` is used.
		 * 
		 * If `config.disableViews` is `true`, `app.dir.views` is `null` and the EJS engine is not automatically configured.
		 */
		views: null as string,

		/**
		 * The app's routes directories.
		 * 
		 * If a value is not provided in `config.routesDir`, the following four values are used:
		 * - `app.dir.mainModule + "/routes"`
		 * - `app.dir.mainModule + "/route"`
		 * - `app.dir.mainModule + "/controllers"`
		 * - `app.dir.mainModule + "/controller"`
		 * 
		 * If a directory in `app.dir.routes` does not exist, it is automatically removed from the array.
		 * 
		 * If `config.disableRoutes` is `true`, `app.dir.routes` is `[]` and the routing is not automatically configured.
		 */
		routes: null as string[]
	},

	/**
	 * The actual Express.js app.
	 */
	express: express(),

	/**
	 * Provides basic `Promise` wrappers around common file system operations, with relatives paths using `app.dir.project` as the base directory.
	 * 
	 * Refer to https://nodejs.org/docs/latest-v14.x/api/fs.html for more information.
	 */
	fileSystem: FS as FileSystem,

	/**
	 * Provides basic methods to send and receive JSON objects from remote servers.
	 */
	jsonRequest: JSONReq as JSONRequest,

	/**
	 * Provides a way to connect to the database, as specified by `config.sqlConfig`, by calling `app.sql.connect()`.
	 * 
	 * If `config.sqlConfig` is not provided, `app.sql` will be `null`.
	 */
	sql: null as Sql,

	// Methods

	/**
	 * Creates, configures and starts listening the Express.js app.
	 * 
	 * For more advanced scenarios, such as using WebSockets, it is advisable to set `config.setupOnly = true`, which makes `run()` not to call `expressApp.listen()` at the end of the setup process.
	 * @param config Optional settings used to configure the routes, paths and so on.
	 */
	run: function (config?: Config): void {
		if (!config)
			config = {};

		if (config.allMethodsRoutesAllByDefault && config.allMethodsRoutesHiddenByDefault)
			throw new Error("Both config.allMethodsRoutesAllByDefault and config.allMethodsRoutesHiddenByDefault are set to true");

		app.dir.initial = process.cwd();

		const appExpress = app.express,
			projectDir = (config.projectDir || app.dir.initial),
			// Using require.main.path does not work on some cloud providers, because
			// they perform additional requires of their own before actually executing
			// the app's main file (like app.js, server.js or index.js).
			mainModuleDir = (config.mainModuleDir || path.dirname(extractCallingFile())),
			staticFilesDir = (config.disableStaticFiles ? null : (config.staticFilesDir || path.join(projectDir, "public"))),
			viewsDir = (config.disableViews ? null : (config.viewsDir || path.join(projectDir, "views"))),
			routesDir = (config.disableRoutes ? [] : (config.routesDir as string[] || [path.join(mainModuleDir, "routes"), path.join(mainModuleDir, "route"), path.join(mainModuleDir, "controllers"), path.join(mainModuleDir, "controller")]));

		for (let i = routesDir.length - 1; i >= 0; i--) {
			if (!routesDir[i] || !fs.existsSync(routesDir[i]))
				routesDir.splice(i, 1);
		}

		app.root = ((!config.root || config.root === "/") ? "" : (config.root.endsWith("/") ? config.root.substr(0, config.root.length - 1) : config.root));
		if (app.root && !app.root.startsWith("/"))
			app.root = "/" + app.root;
		app.localIp = (("localIp" in config) ? config.localIp : "127.0.0.1");
		app.port = (Math.max(parseInt(config.port as any) || parseInt(process.env.PORT) || 0, 0) || 3000);

		app.dir.project = projectDir;
		app.dir.mainModule = mainModuleDir;
		app.dir.staticFiles = staticFilesDir;
		app.dir.views = viewsDir;
		app.dir.routes = routesDir;

		FS.rootDir = projectDir;

		appExpress.locals.root = app.root;
		appExpress.disable("x-powered-by");
		appExpress.disable("etag");

		if (config.sqlConfig) {
			// Only require our Sql module if it is actually going to be used.
			const sql = require("./sql").Sql;
			sql.init(config.sqlConfig);
			app.sql = sql;
		}

		// Object.freeze causes serious performance issues in property access time!
		//Object.freeze(FS);
		//Object.freeze(app.route);
		//Object.freeze(app.http);
		//Object.freeze(app.dir);
		//Object.freeze(app);

		if (!config.disableCompression)
			appExpress.use(require("compression")());

		if (config.preInitCallback)
			config.preInitCallback();

		if (staticFilesDir)
			appExpress.use(express.static(staticFilesDir, config.staticFilesConfig || {
				cacheControl: true,
				etag: false,
				maxAge: "365d"
			}));

		if (!config.disableCookies)
			appExpress.use(require("cookie-parser")());

		if (!config.disablePostBodyParser) {
			// http://expressjs.com/en/api.html#express.json
			// http://expressjs.com/en/api.html#express.urlencoded
			appExpress.use(express.json());
			appExpress.use(express.urlencoded({ extended: true }));
		}

		if (viewsDir) {
			const ejs = require("ejs"),
				LRU = require("lru-cache");
			ejs.cache = new LRU(Math.max(200, parseInt(config.viewsCacheSize as any) | 0));
			appExpress.set("views", viewsDir);
			// https://www.npmjs.com/package/ejs#layouts
			// https://www.npmjs.com/package/express-ejs-layouts
			appExpress.set("view engine", "ejs");
			appExpress.use(require("express-ejs-layouts"));
		}

		if (!config.disableNoCacheHeader)
			appExpress.use(removeCacheHeader);

		if (config.preRouteCallback)
			config.preRouteCallback();

		if (config.logRoutesToConsole)
			console.log("HTTP Method - Full Route - File");

		if (routesDir.length) {
			const routes: InternalRoute[] = [],
				validHttpMethods: ValidHttpMethods = {
					all: true,
					get: true,
					post: true,
					put: true,
					delete: true,
					patch: true,
					options: true,
					head: true
				};

			for (let i = 0; i < routesDir.length; i++)
				extractRoutesFromDir(config, validHttpMethods, "/", routes, routesDir[i]);

			if (!routes.length) {
				if (config.logRoutesToConsole)
					console.log("No routes found!");
			} else {
				if (config.logRoutesToConsole) {
					routes.sort((a, b) => (a.absolutePath.localeCompare(b.absolutePath) || a.route.localeCompare(b.route) || a.httpMethod.localeCompare(b.httpMethod)));

					let lastFile: string = null;
					for (let i = 0; i < routes.length; i++) {
						const route = routes[i];
						console.log(`${route.httpMethod} - ${route.route} - ${route.absolutePath}`);
					}
				}

				routes.sort((a, b) => (a.route.localeCompare(b.route) || a.httpMethod.localeCompare(b.httpMethod)));

				for (let i = routes.length - 1; i > 0; i--) {
					const r1 = routes[i], r2 = routes[i - 1];
					if (r1.route === r2.route && (r1.httpMethod === "all" || r2.httpMethod === "all" || r1.httpMethod === r2.httpMethod))
						throw new Error(`Conflicting route "${routes[i].httpMethod} ${routes[i].route}" in files ${routes[i].absolutePath} and ${routes[i - 1].absolutePath}`);
				}

				registerRoutes(appExpress, routes);

				routes.fill(null);
			}
		} else if (config.logRoutesToConsole) {
			console.log("No routes found!");
		}

		if (config.postRouteCallback)
			config.postRouteCallback();

		appExpress.use(notFoundHandler);

		if (config.errorHandler) {
			if (config.errorHandler.length !== 4)
				throw new Error("config.errorHandler must have 4 parameters");
			appExpress.use(createErrorHandler(config.errorHandler) as ErrorHandler);
		} else if (config.htmlErrorHandler) {
			if (config.htmlErrorHandler.length !== 4)
				throw new Error("config.htmlErrorHandler must have 4 parameters");
			htmlErrorHandler = createErrorHandler(config.htmlErrorHandler) as ErrorHandler;
			appExpress.use(errorHandlerWithCustomHtmlError);
		}
		appExpress.use(errorHandlerWithoutCustomHtmlError);

		if (!config.setupOnly)
			appExpress.listen(app.port, app.localIp, config.listenCallback);
	}
};

export = app;

﻿"use strict";
const express = require("express");
const fs = require("fs");
const path = require("path");
const fileSystem_1 = require("./fileSystem");
const request_1 = require("./request");
/** @internal */
function httpGeneric(method) {
    return function (target, propertyKey, descriptor) {
        const f = (target[propertyKey] || target);
        if (!f["httpMethods"])
            f["httpMethods"] = [];
        f["httpMethods"].push(method);
    };
}
/** @internal */
function extractCallingFile() {
    // https://github.com/v8/v8/wiki/Stack%20Trace%20API#customizing-stack-traces
    // https://v8.dev/docs/stack-trace-api#customizing-stack-traces
    const prepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = function (err, stackTraces) { return stackTraces; };
    // For efficiency stack traces are not formatted when they are captured but on demand,
    // the first time the stack property is accessed. A stack trace is formatted by calling
    // Error.prepareStackTrace(error, structuredStackTrace)
    const stack = (new Error()).stack;
    Error.prepareStackTrace = prepareStackTrace;
    // Try to skip the call to this function and to the function that called this one.
    return stack[Math.min(stack.length, 3) - 1].getFileName();
}
/** @internal */
function extractRoutesFromObject(config, validHttpMethods, prefix, routes, absolutePath, obj, thisArg) {
    const names = Object.getOwnPropertyNames(obj);
    for (let i = names.length - 1; i >= 0; i--) {
        const n = names[i];
        if (!n || n === "constructor")
            continue;
        const f = obj[n];
        if (f && (typeof f) === "function") {
            let fullMethodRoute = f["routeFullMethodRoute"], routeMethodName = f["routeMethodName"], routeMiddleware = f["routeMiddleware"], routeMiddlewareWithBody = null, httpMethods = f["httpMethods"];
            const httpHidden = f["httpHidden"], routeFileUpload = parseInt(f["routeFileUpload"]);
            delete f["routeFullMethodRoute"];
            delete f["routeMethodName"];
            delete f["routeMiddleware"];
            delete f["httpMethods"];
            delete f["httpHidden"];
            delete f["routeFileUpload"];
            if (httpHidden || (config.allMethodsRoutesHiddenByDefault && (!httpMethods || !httpMethods.length)))
                continue;
            if (f.length > 3)
                throw new Error(`Function "${f.name}", in file ${absolutePath}, should have 3 parameters at most`);
            if (routeFileUpload && config.disableFileUpload)
                throw new Error(`config.disableFileUpload is true and app.route.fileUpload() is being used on function "${f.name}", in file ${absolutePath}`);
            if (fullMethodRoute) {
                if (!fullMethodRoute.startsWith("/"))
                    fullMethodRoute = "/" + fullMethodRoute;
            }
            else {
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
            if (!httpMethods || !httpMethods.length)
                httpMethods = [config.allMethodsRoutesAllByDefault ? "all" : "get"];
            else if (httpMethods.length > 1)
                httpMethods.sort();
            let all = false, canHandleBody = false;
            for (let m = httpMethods.length - 1; m >= 0; m--) {
                if (m > 0 && httpMethods[m] === httpMethods[m - 1]) {
                    httpMethods.splice(m, 1);
                }
                else if (!validHttpMethods[httpMethods[m]]) {
                    throw new Error(`Invalid http method "${httpMethods[m]}" used for the class method "${n}" in file ${absolutePath}`);
                }
                else {
                    switch (httpMethods[m]) {
                        case "all":
                            all = true;
                        case "delete":
                        case "patch":
                        case "post":
                        case "put":
                            canHandleBody = true;
                            break;
                    }
                }
            }
            if (canHandleBody) {
                if (routeFileUpload)
                    routeMiddlewareWithBody = [createFileUploadMiddleware(routeFileUpload)];
                else if (!config.disableBodyParser)
                    routeMiddlewareWithBody = [jsonBodyParserMiddleware, urlencodedBodyParserMiddleware];
                if (routeMiddleware && routeMiddleware.length) {
                    if (!routeMiddlewareWithBody)
                        routeMiddlewareWithBody = routeMiddleware;
                    else
                        routeMiddlewareWithBody.push.apply(routeMiddlewareWithBody, routeMiddleware);
                }
            }
            else if (routeFileUpload) {
                throw new Error(`app.route.fileUpload() is being used on function "${f.name}", in file ${absolutePath}, without at least one of the required app.http decorators: all, delete, patch, post or put`);
            }
            if (all) {
                routes.push({
                    absolutePath,
                    route: fullMethodRoute,
                    httpMethod: "all",
                    routeMiddleware: routeMiddlewareWithBody,
                    boundUserHandler: f.bind(thisArg)
                });
            }
            else {
                const boundUserHandler = f.bind(thisArg);
                for (let m = httpMethods.length - 1; m >= 0; m--) {
                    canHandleBody = false;
                    switch (httpMethods[m]) {
                        case "delete":
                        case "patch":
                        case "post":
                        case "put":
                            canHandleBody = true;
                            break;
                    }
                    routes.push({
                        absolutePath,
                        route: fullMethodRoute,
                        httpMethod: httpMethods[m],
                        routeMiddleware: (canHandleBody ? routeMiddlewareWithBody : routeMiddleware),
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
function extractRoutesFromFunctionOrObject(config, validHttpMethods, prefix, routes, absolutePath, name, f) {
    if (("routeFullClassRoute" in f)) {
        prefix = f["routeFullClassRoute"];
        if (!prefix) {
            prefix = "/";
        }
        else {
            if (!prefix.startsWith("/"))
                prefix = "/" + prefix;
            if (!prefix.endsWith("/"))
                prefix += "/";
        }
    }
    else {
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
function extractRoutesFromFile(config, validHttpMethods, prefix, routes, absolutePath, name) {
    const r = require(absolutePath);
    if (!r)
        throw new Error(`File ${absolutePath} does not export a valid object/class/function`);
    switch (typeof r) {
        case "object":
            // Plain object or ES module
            let s;
            if (r.__esModule || ((s = Object.getOwnPropertySymbols(r)) && s.length && s[0] && r[s[0]] === "Module")) {
                for (let n in r) {
                    const f = r[n];
                    if (f && (typeof f) === "function")
                        extractRoutesFromFunctionOrObject(config, validHttpMethods, prefix, routes, absolutePath, name, f);
                }
            }
            else {
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
function extractRoutesFromDir(config, validHttpMethods, prefix, routes, dir) {
    const names = fs.readdirSync(dir);
    if (!names)
        return;
    for (let i = names.length - 1; i >= 0; i--) {
        const name = names[i];
        let absolutePath;
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
function createRegularHandler(boundUserHandler) {
    // Express.js checks the handler's length to determine if it is a regular handler,
    // or an error handler. For a handler to be considered an error handler, it
    // must at most 3 parameters.
    return function (req, res, next) {
        const r = boundUserHandler(req, res, next);
        if (r)
            Promise.resolve(r).catch(next);
    };
}
/** @internal */
function createErrorHandler(boundUserHandler) {
    // Express.js checks the handler's length to determine if it is a regular handler,
    // or an error handler. For a handler to be considered an error handler, it
    // must have 4 parameters.
    return function (err, req, res, next) {
        const r = boundUserHandler(err, req, res, next);
        if (r)
            Promise.resolve(r).catch(next);
    };
}
/** @internal */
function createFileUploadMiddleware(limitFileSize) {
    if (!cachedFileUploadMiddlewares)
        cachedFileUploadMiddlewares = {};
    if (!limitFileSize || limitFileSize <= 0)
        limitFileSize = 10485760;
    const limitFileSizeStr = limitFileSize.toString();
    let middleware = cachedFileUploadMiddlewares[limitFileSizeStr];
    if (!middleware) {
        const multerMiddleware = app.multer({
            limits: {
                fieldNameSize: 256,
                fileSize: limitFileSize
            },
            storage: app.multer.memoryStorage()
        }).any();
        middleware = function (req, res, next) {
            multerMiddleware(req, res, (err) => {
                const uploadedFiles = {}, uploadedFilesArray = (req["files"] || []);
                req.uploadedFiles = uploadedFiles;
                req.uploadedFilesArray = uploadedFilesArray;
                for (let i = uploadedFilesArray.length - 1; i >= 0; i--) {
                    const uploadedFile = uploadedFilesArray[i];
                    if (!uploadedFiles[uploadedFile.fieldname])
                        uploadedFiles[uploadedFile.fieldname] = uploadedFile;
                }
                if (err) {
                    if (err instanceof app.multer["MulterError"]) {
                        const uploadedFile = {
                            buffer: null,
                            encoding: null,
                            fieldname: (err.field || ""),
                            mimetype: null,
                            originalname: null,
                            size: 0,
                            errorcode: (err.code || "UNKNOWN_ERROR"),
                            errormessage: (err.message || "Unknown error")
                        };
                        if (!uploadedFiles[uploadedFile.fieldname])
                            uploadedFiles[uploadedFile.fieldname] = uploadedFile;
                        uploadedFilesArray.push(uploadedFile);
                    }
                    else {
                        next(err);
                        return;
                    }
                }
                next();
            });
        };
        cachedFileUploadMiddlewares[limitFileSizeStr] = middleware;
    }
    return middleware;
}
/** @internal */
function registerRoutes(appExpress, routes) {
    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        if (route.routeMiddleware && route.routeMiddleware.length) {
            const m = appExpress[route.httpMethod], args = [route.route];
            args.push.apply(args, route.routeMiddleware);
            args.push(createRegularHandler(route.boundUserHandler));
            m.apply(appExpress, args);
        }
        else {
            appExpress[route.httpMethod](route.route, createRegularHandler(route.boundUserHandler));
        }
    }
}
// Private Middlewares
/** @internal */
function removeCacheHeader(req, res, next) {
    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.header("Expires", "-1");
    res.header("Pragma", "no-cache");
    next();
}
/** @internal */
function notFoundHandler(req, res, next) {
    next({
        message: "Not found",
        status: 404
    });
}
/** @internal */
function errorHandlerWithCustomHtmlError(err, req, res, next) {
    err.status = (parseInt(err.status) || 500);
    res.status(err.status);
    if (req.path.indexOf("/api/") >= 0 || (req.headers.accept && req.headers.accept.indexOf("application/json") >= 0))
        res.json(err.message || (err.status === 404 ? "Not found" : "Internal error"));
    else
        htmlErrorHandler(err, req, res, next);
}
/** @internal */
function errorHandlerWithoutCustomHtmlError(err, req, res, next) {
    err.status = (parseInt(err.status) || 500);
    res.status(err.status);
    if (req.path.indexOf("/api/") >= 0 || (req.headers.accept && req.headers.accept.indexOf("application/json") >= 0))
        res.json(err.message || (err.status === 404 ? "Not found" : "Internal error"));
    else
        res.contentType("text/plain").send(err.message || (err.status === 404 ? "Not found" : "Internal error"));
}
/** @internal */
let htmlErrorHandler;
/** @internal */
let cachedFileUploadMiddlewares;
/** @internal */
let jsonBodyParserMiddleware;
/** @internal */
let urlencodedBodyParserMiddleware;
const app = {
    // Route Decorators
    route: {
        fullClassRoute: function (routeFullClassRoute) { return function (constructor) { constructor["routeFullClassRoute"] = routeFullClassRoute; }; },
        fullMethodRoute: function (routeFullMethodRoute) { return function (target, propertyKey, descriptor) { (target[propertyKey] || target)["routeFullMethodRoute"] = routeFullMethodRoute; }; },
        className: function (routeClassName) { return function (constructor) { constructor["routeClassName"] = routeClassName; }; },
        methodName: function (routeMethodName) { return function (target, propertyKey, descriptor) { (target[propertyKey] || target)["routeMethodName"] = routeMethodName; }; },
        middleware: function (...middleware) { return function (target, propertyKey, descriptor) { const f = (target[propertyKey] || target); if (!f["routeMiddleware"])
            f["routeMiddleware"] = []; if (middleware)
            f["routeMiddleware"].push.apply(f["routeMiddleware"], middleware); }; },
        fileUpload: function (limitFileSize) { return function (target, propertyKey, descriptor) { const f = (target[propertyKey] || target); if (!f["routeMiddleware"])
            f["routeMiddleware"] = []; f["routeMiddleware"].push(createFileUploadMiddleware(parseInt(limitFileSize))); f["routeFileUpload"] = true; }; }
    },
    http: {
        all: function () { return httpGeneric("all"); },
        get: function () { return httpGeneric("get"); },
        post: function () { return httpGeneric("post"); },
        put: function () { return httpGeneric("put"); },
        delete: function () { return httpGeneric("delete"); },
        patch: function () { return httpGeneric("patch"); },
        options: function () { return httpGeneric("options"); },
        head: function () { return httpGeneric("head"); },
        hidden: function () { return function (target, propertyKey, descriptor) { (target[propertyKey] || target)["httpHidden"] = true; }; }
    },
    // Properties
    root: null,
    staticRoot: null,
    localIp: null,
    port: 0,
    dir: {
        /**
         * The initial working directory, obtained by calling `process.cwd()` at the beginning of the setup process.
         */
        initial: null,
        /**
         * The directory where the main app's module is located.
         *
         * If a value is not provided in `config.mainModuleDir`, the directory of the module calling `app.run()` is used.
         *
         * Using `require.main.path` does not work on some cloud providers, because they perform additional requires of their own before actually executing the app's main file (like `app.js`, `server.js` or `index.js`).
         *
         * `app.dir.mainModule` is used as `app.dir.routes`'s base directory when `config.routesDir` is not provided.
         */
        mainModule: null,
        /**
         * The app's "project" directory.
         *
         * If a value is not provided in `config.projectDir`, `app.dir.initial` is used.
         *
         * `app.dir.project` is used as `app.dir.staticFiles`'s and `app.dir.views`'s base directory when `config.staticFilesDir` / `config.viewsDir` are not provided.
         *
         * `app.dir.project` is also used as the base directory for all `app.fileSystem` methods.
         */
        project: null,
        /**
         * The app's static files directory.
         *
         * If a value is not provided in `config.staticFilesDir`, `app.dir.project + "/public"` is used.
         *
         * If `config.disableStaticFiles` is `true`, `app.dir.staticFiles` is `null` and static file handling is not automatically configured.
         */
        staticFiles: null,
        /**
         * The app's views directory.
         *
         * If a value is not provided in `config.viewsDir`, `app.dir.project + "/views"` is used.
         *
         * If `config.disableViews` is `true`, `app.dir.views` is `null` and the EJS engine is not automatically configured.
         */
        views: null,
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
        routes: null
    },
    express: express(),
    fileSystem: fileSystem_1.FileSystem,
    request: {
        json: request_1.JSONRequest,
        string: request_1.StringRequest,
        buffer: request_1.BufferRequest
    },
    sql: null,
    multer: null,
    // Methods
    run: function (config) {
        if (!config)
            config = {};
        if (config.allMethodsRoutesAllByDefault && config.allMethodsRoutesHiddenByDefault)
            throw new Error("Both config.allMethodsRoutesAllByDefault and config.allMethodsRoutesHiddenByDefault are set to true");
        app.dir.initial = process.cwd();
        const appExpress = app.express, projectDir = (config.projectDir || app.dir.initial), 
        // Using require.main.path does not work on some cloud providers, because
        // they perform additional requires of their own before actually executing
        // the app's main file (like app.js, server.js or index.js).
        mainModuleDir = (config.mainModuleDir || path.dirname(extractCallingFile())), staticFilesDir = (config.disableStaticFiles ? null : (config.staticFilesDir || path.join(projectDir, "public"))), viewsDir = (config.disableViews ? null : (config.viewsDir || path.join(projectDir, "views"))), routesDir = (config.disableRoutes ? [] : (config.routesDir || [path.join(mainModuleDir, "routes"), path.join(mainModuleDir, "route"), path.join(mainModuleDir, "controllers"), path.join(mainModuleDir, "controller")]));
        for (let i = routesDir.length - 1; i >= 0; i--) {
            if (!routesDir[i] || !fs.existsSync(routesDir[i]))
                routesDir.splice(i, 1);
        }
        app.root = ((!config.root || config.root === "/") ? "" : (config.root.endsWith("/") ? config.root.substr(0, config.root.length - 1) : config.root));
        if (app.root && !app.root.startsWith("/"))
            app.root = "/" + app.root;
        if (!("staticRoot" in config)) {
            app.staticRoot = "/public";
        }
        else {
            app.staticRoot = ((!config.staticRoot || config.staticRoot === "/") ? "" : (config.staticRoot.endsWith("/") ? config.staticRoot.substr(0, config.staticRoot.length - 1) : config.staticRoot));
            if (app.staticRoot && !app.staticRoot.startsWith("/"))
                app.staticRoot = "/" + app.staticRoot;
        }
        if (app.root)
            app.staticRoot = app.root + app.staticRoot;
        app.localIp = (("localIp" in config) ? config.localIp : "127.0.0.1");
        app.port = (Math.max(parseInt(config.port) || parseInt(process.env.PORT) || 0, 0) || 3000);
        app.dir.project = projectDir;
        app.dir.mainModule = mainModuleDir;
        app.dir.staticFiles = staticFilesDir;
        app.dir.views = viewsDir;
        app.dir.routes = routesDir;
        fileSystem_1.FileSystem.rootDir = projectDir;
        appExpress.locals.root = app.root;
        appExpress.locals.staticRoot = app.staticRoot;
        appExpress.disable("x-powered-by");
        appExpress.disable("etag");
        if (config.sqlConfig) {
            // Only require our Sql module if it is actually going to be used.
            const sql = require("./sql");
            sql.init(config.sqlConfig);
            app.sql = sql.Sql;
        }
        // Object.freeze causes serious performance issues in property access time!
        //Object.freeze(FS);
        //Object.freeze(app.route);
        //Object.freeze(app.http);
        //Object.freeze(app.dir);
        //Object.freeze(app);
        if (config.initCallback)
            config.initCallback();
        // Apparently, there are great discussions about using or not compression and about
        // serving static files directly from Node.js/Express...
        // https://expressjs.com/en/advanced/best-practice-performance.html#use-gzip-compression
        // https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy
        // https://nodejs.org/api/zlib.html#zlib_compressing_http_requests_and_responses
        if (staticFilesDir) {
            const staticOptions = config.staticFilesConfig || {
                cacheControl: true,
                etag: false,
                immutable: true,
                maxAge: "365d"
            }, staticRootWithoutAppRoot = (app.root ? app.staticRoot.substr(app.root.length) : app.staticRoot);
            if (staticRootWithoutAppRoot)
                appExpress.use(staticRootWithoutAppRoot, express.static(staticFilesDir, staticOptions));
            else
                appExpress.use(express.static(staticFilesDir, staticOptions));
        }
        if (!config.disableCookies)
            appExpress.use(require("cookie-parser")());
        if (config.enableDynamicCompression)
            appExpress.use(require("compression")());
        if (!config.disableBodyParser) {
            // http://expressjs.com/en/api.html#express.json
            // http://expressjs.com/en/api.html#express.urlencoded
            // Instead of globally adding these middlewares, let's add them only to routes that can actually handle a body.
            let bodyParserLimit = parseInt(config.bodyParserLimit);
            if (isNaN(bodyParserLimit) || bodyParserLimit <= 0)
                bodyParserLimit = 10485760;
            jsonBodyParserMiddleware = express.json({ limit: bodyParserLimit });
            urlencodedBodyParserMiddleware = express.urlencoded({ limit: bodyParserLimit, extended: true });
        }
        if (!config.disableFileUpload) {
            // https://www.npmjs.com/package/multer
            // https://github.com/expressjs/multer/blob/master/StorageEngine.md
            app.multer = require("multer");
        }
        if (viewsDir) {
            const ejs = require("ejs"), LRU = require("lru-cache");
            let viewsCacheSize = parseInt(config.viewsCacheSize);
            if (isNaN(viewsCacheSize) || viewsCacheSize <= 0)
                viewsCacheSize = 200;
            ejs.cache = new LRU(viewsCacheSize);
            appExpress.set("views", viewsDir);
            // https://www.npmjs.com/package/ejs#layouts
            // https://www.npmjs.com/package/express-ejs-layouts
            appExpress.set("view engine", "ejs");
            appExpress.use(require("express-ejs-layouts"));
        }
        if (!config.disableNoCacheHeader)
            appExpress.use(removeCacheHeader);
        if (config.beforeRouteCallback)
            config.beforeRouteCallback();
        if (config.logRoutesToConsole)
            console.log("HTTP Method - Full Route - File");
        if (routesDir.length) {
            const routes = [], validHttpMethods = {
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
            }
            else {
                if (config.logRoutesToConsole) {
                    routes.sort((a, b) => (a.absolutePath.localeCompare(b.absolutePath) || a.route.localeCompare(b.route) || a.httpMethod.localeCompare(b.httpMethod)));
                    let lastFile = null;
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
        }
        else if (config.logRoutesToConsole) {
            console.log("No routes found!");
        }
        cachedFileUploadMiddlewares = undefined;
        jsonBodyParserMiddleware = undefined;
        urlencodedBodyParserMiddleware = undefined;
        if (config.afterRouteCallback)
            config.afterRouteCallback();
        appExpress.use(notFoundHandler);
        if (config.errorHandler) {
            if (config.errorHandler.length !== 4)
                throw new Error("config.errorHandler must have 4 parameters");
            appExpress.use(createErrorHandler(config.errorHandler));
        }
        else if (config.htmlErrorHandler) {
            if (config.htmlErrorHandler.length !== 4)
                throw new Error("config.htmlErrorHandler must have 4 parameters");
            htmlErrorHandler = createErrorHandler(config.htmlErrorHandler);
            appExpress.use(errorHandlerWithCustomHtmlError);
        }
        appExpress.use(errorHandlerWithoutCustomHtmlError);
        if (!config.setupOnly)
            appExpress.listen(app.port, app.localIp);
    }
};
module.exports = app;

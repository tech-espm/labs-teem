"use strict";
const express = require("express");
const fs = require("fs");
const path = require("path");
const fileSystem_1 = require("./fileSystem");
const json_1 = require("./json");
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
            let fullMethodRoute = f["routeFullMethodRoute"], routeMethodName = f["routeMethodName"], httpMethods = f["httpMethods"];
            const httpHidden = f["httpHidden"], routeMiddleware = f["routeMiddleware"];
            delete f["routeFullMethodRoute"];
            delete f["routeMethodName"];
            delete f["httpMethods"];
            delete f["httpHidden"];
            delete f["routeMiddleware"];
            if (httpHidden || (config.allMethodsRoutesHiddenByDefault && (!httpMethods || !httpMethods.length)))
                continue;
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
            if (!httpMethods || !httpMethods.length) {
                routes.push({
                    absolutePath,
                    route: fullMethodRoute,
                    httpMethod: (config.allMethodsRoutesAllByDefault ? "all" : "get"),
                    routeMiddleware,
                    userHandler: f,
                    thisArg
                });
            }
            else {
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
                        userHandler: f,
                        thisArg
                    });
                }
                else {
                    const boundUserHandler = f.bind(thisArg);
                    for (let m = httpMethods.length - 1; m >= 0; m--)
                        routes.push({
                            absolutePath,
                            route: fullMethodRoute,
                            httpMethod: httpMethods[m],
                            routeMiddleware,
                            userHandler: f,
                            thisArg
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
/** @internal */
function createHandler(userHandler, thisArg) {
    return function () {
        const r = userHandler.apply(thisArg, arguments);
        if (r)
            Promise.resolve(r).catch(arguments[arguments.length - 1]);
    };
}
/** @internal */
function registerRoutes(appExpress, routes) {
    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        if (route.routeMiddleware && route.routeMiddleware.length) {
            const m = appExpress[route.httpMethod], args = [route.route];
            args.push.apply(args, route.routeMiddleware);
            args.push(createHandler(route.userHandler, route.thisArg));
            m.apply(m, args);
        }
        else {
            appExpress[route.httpMethod](route.route, createHandler(route.userHandler, route.thisArg));
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
function errorHandler(err, req, res, next) {
    err.status = (parseInt(err.status) || 500);
    res.status(err.status);
    if (req.path.indexOf("/api/") >= 0 || req.accepts("json") || !viewErrorHandler)
        res.json(err.message || (err.status === 404 ? "Not found" : "Internal error"));
    else
        viewErrorHandler(err, req, res, next);
}
/** @internal */
let viewErrorHandler = null;
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
        fullClassRoute: function (routeFullClassRoute) { return function (constructor) { constructor["routeFullClassRoute"] = routeFullClassRoute; }; },
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
        fullMethodRoute: function (routeFullMethodRoute) { return function (target, propertyKey, descriptor) { (target[propertyKey] || target)["routeFullMethodRoute"] = routeFullMethodRoute; }; },
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
        className: function (routeClassName) { return function (constructor) { constructor["routeClassName"] = routeClassName; }; },
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
        methodName: function (routeMethodName) { return function (target, propertyKey, descriptor) { (target[propertyKey] || target)["routeMethodName"] = routeMethodName; }; },
        middleware: function (...middleware) { return function (target, propertyKey, descriptor) { const f = (target[propertyKey] || target); f["routeMiddleware"] = middleware; }; }
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
        all: function () { return httpGeneric("all"); },
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
        get: function () { return httpGeneric("get"); },
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
        post: function () { return httpGeneric("post"); },
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
        put: function () { return httpGeneric("put"); },
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
        delete: function () { return httpGeneric("delete"); },
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
        patch: function () { return httpGeneric("patch"); },
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
        options: function () { return httpGeneric("options"); },
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
        head: function () { return httpGeneric("head"); },
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
        hidden: function () { return function (target, propertyKey, descriptor) { (target[propertyKey] || target)["httpHidden"] = true; }; }
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
    root: null,
    /**
     * The IP address used when setting up the server.
     *
     * If a value is not provided in `config.localIp`, `127.0.0.1` is used.
     */
    localIp: null,
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
    /**
     * The actual Express.js app.
     */
    express: null,
    /**
     * Provides basic `Promise` wrappers around common file system operations, with relatives paths using `app.dir.project` as the base directory.
     *
     * Refer to https://nodejs.org/docs/latest-v14.x/api/fs.html for more information.
     */
    fileSystem: fileSystem_1.FileSystem,
    /**
     * Provides basic methods to send and receive JSON objects from remote servers.
     */
    jsonRequest: json_1.JSONRequest,
    /**
     * Provides a way to connect to the database, as specified by `config.sqlConfig`, by calling `app.sql.connect()`.
     *
     * If `config.sqlConfig` is not provided, `app.sql` will be `null`.
     */
    sql: null,
    // Methods
    /**
     * Creates, configures and starts the Express.js app.
     *
     * This is operation is asynchronous and errors must be handled like errors from regular promises:
     *
     * ```ts
     * app.run(...).catch((reason) => {
     *     // Handle errors here
     * });
     * ```
     *
     * The following construct can be used just to display any possible errors without further handling them:
     *
     * ```ts
     * app.run(...).catch(console.error);
     * ```
     * @param config Optional settings used to configure the routes, paths and so on.
     */
    run: async function (config) {
        if (!config)
            config = {};
        if (config.allMethodsRoutesAllByDefault && config.allMethodsRoutesHiddenByDefault)
            throw new Error("Both config.allMethodsRoutesAllByDefault and config.allMethodsRoutesHiddenByDefault are set to true");
        app.dir.initial = process.cwd();
        const appExpress = express(), projectDir = (config.projectDir || app.dir.initial), 
        // Using require.main.path does not work on some cloud providers, because
        // they perform additional requires of their own before actually executing
        // the app's main file (like app.js, server.js or index.js).
        mainModuleDir = (config.mainModuleDir || path.dirname(extractCallingFile())), staticFilesDir = (config.disableStaticFiles ? null : (config.staticFilesDir || path.join(projectDir, "public"))), viewsDir = (config.disableViews ? null : (config.viewsDir || path.join(projectDir, "views"))), routesDir = (config.disableRoutes ? [] : (config.routesDir || [path.join(mainModuleDir, "routes"), path.join(mainModuleDir, "route"), path.join(mainModuleDir, "controllers"), path.join(mainModuleDir, "controller")]));
        for (let i = routesDir.length - 1; i >= 0; i--) {
            if (!routesDir[i] || !fs.existsSync(routesDir[i]))
                routesDir.splice(i, 1);
        }
        app.express = appExpress;
        app.root = ((!config.root || config.root === "/") ? "" : (config.root.endsWith("/") ? config.root.substr(0, config.root.length - 1) : config.root));
        if (app.root && !app.root.startsWith("/"))
            app.root = "/" + app.root;
        app.localIp = (("localIp" in config) ? config.localIp : "127.0.0.1");
        app.port = (Math.max(parseInt(config.port) || parseInt(process.env.PORT) || 0, 0) || 3000);
        app.dir.project = projectDir;
        app.dir.mainModule = mainModuleDir;
        app.dir.staticFiles = staticFilesDir;
        app.dir.views = viewsDir;
        app.dir.routes = routesDir;
        fileSystem_1.FileSystem.rootDir = projectDir;
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
            await config.preInitCallback();
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
            const ejs = require("ejs"), LRU = require("lru-cache");
            ejs.cache = new LRU(Math.max(200, parseInt(config.viewsCacheSize) | 0));
            appExpress.set("views", viewsDir);
            // https://www.npmjs.com/package/ejs#layouts
            // https://www.npmjs.com/package/express-ejs-layouts
            appExpress.set("view engine", "ejs");
            appExpress.use(require("express-ejs-layouts"));
        }
        if (!config.disableNoCacheHeader)
            appExpress.use(removeCacheHeader);
        if (config.preRouteCallback)
            await config.preRouteCallback();
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
        if (config.postRouteCallback)
            await config.postRouteCallback();
        appExpress.use(notFoundHandler);
        if (config.errorHandler) {
            if (config.errorHandler.length !== 4)
                throw new Error("config.errorHandler must have 4 parameters");
            appExpress.use(config.errorHandler);
        }
        else {
            if (config.htmlErrorHandler) {
                if (config.htmlErrorHandler.length !== 4)
                    throw new Error("config.htmlErrorHandler must have 4 parameters");
                viewErrorHandler = config.htmlErrorHandler;
            }
            appExpress.use(errorHandler);
        }
        if (config.listenHandler)
            await config.listenHandler();
        else
            return new Promise((resolve, reject) => {
                appExpress.listen(app.port, app.localIp, resolve);
            });
    }
};
module.exports = app;

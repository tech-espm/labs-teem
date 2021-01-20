/// <reference types="node" />
import express = require("express");
import fs = require("fs");
import { BufferContainer } from "./fileSystem";
import { JSONResponse } from "./json";
import type { PoolConfig } from "mysql";
import type { ServeStaticOptions } from "serve-static";
import type { SqlInterface } from "./sql";
declare namespace app {
    interface Request extends express.Request {
    }
    interface Response extends express.Response {
    }
    interface NextFunction extends express.NextFunction {
    }
    interface Sql extends SqlInterface {
    }
}
interface FileSystem {
    absolutePath(relativePath: string, filename?: string): string;
    validateFilename(filename: string): string;
    createDirectory(relativePath: string, options: fs.Mode | fs.MakeDirectoryOptions): Promise<void>;
    deleteDirectory(relativePath: string): Promise<void>;
    deleteFilesAndDirectory(relativePath: string): Promise<void>;
    renameFile(currentRelativePath: string, newRelativePath: string): Promise<void>;
    deleteFile(relativePath: string): Promise<void>;
    fileExists(relativePath: string): Promise<boolean>;
    saveBuffer(buffer: Buffer | BufferContainer, directoryRelativePath: string, filename: string, mode?: fs.Mode): Promise<void>;
    createNewEmptyFile(directoryRelativePath: string, filename: string, mode?: fs.Mode): Promise<void>;
    appendBufferToExistingFile(buffer: Buffer | BufferContainer, directoryRelativePath: string, filename: string): Promise<void>;
}
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
interface Action {
    (): Promise<void> | void;
}
interface ErrorHandler {
    (err: any, req: app.Request, res: app.Response, next: app.NextFunction): void;
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
    preInitCallback?: Action;
    preRouteCallback?: Action;
    postRouteCallback?: Action;
    errorHandler?: ErrorHandler;
    htmlErrorHandler?: ErrorHandler;
    listenHandler?: Action;
}
declare const app: {
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
        fullClassRoute: (routeFullClassRoute: string) => ClassDecorator;
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
        fullMethodRoute: (routeFullMethodRoute: string) => MethodDecorator;
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
        className: (routeClassName: string) => ClassDecorator;
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
        methodName: (routeMethodName: string) => MethodDecorator;
        middleware: (...middleware: any[]) => MethodDecorator;
    };
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
        all: () => MethodDecorator;
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
        get: () => MethodDecorator;
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
        post: () => MethodDecorator;
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
        put: () => MethodDecorator;
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
        delete: () => MethodDecorator;
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
        patch: () => MethodDecorator;
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
        options: () => MethodDecorator;
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
        head: () => MethodDecorator;
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
        hidden: () => MethodDecorator;
    };
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
    root: string;
    /**
     * The IP address used when setting up the server.
     *
     * If a value is not provided in `config.localIp`, `127.0.0.1` is used.
     */
    localIp: string;
    /**
     * The TCP port used when setting up the server.
     *
     * If a value is not provided in `config.port`, `3000` is used.
     */
    port: number;
    /**
     * Important paths used by the framework.
     */
    dir: {
        /**
         * The initial working directory, obtained by calling `process.cwd()` at the beginning of the setup process.
         */
        initial: string;
        /**
         * The directory where the main app's module is located.
         *
         * If a value is not provided in `config.mainModuleDir`, the directory of the module calling `app.run()` is used.
         *
         * Using `require.main.path` does not work on some cloud providers, because they perform additional requires of their own before actually executing the app's main file (like `app.js`, `server.js` or `index.js`).
         *
         * `app.dir.mainModule` is used as `app.dir.routes`'s base directory when `config.routesDir` is not provided.
         */
        mainModule: string;
        /**
         * The app's "project" directory.
         *
         * If a value is not provided in `config.projectDir`, `app.dir.initial` is used.
         *
         * `app.dir.project` is used as `app.dir.staticFiles`'s and `app.dir.views`'s base directory when `config.staticFilesDir` / `config.viewsDir` are not provided.
         *
         * `app.dir.project` is also used as the base directory for all `app.fileSystem` methods.
         */
        project: string;
        /**
         * The app's static files directory.
         *
         * If a value is not provided in `config.staticFilesDir`, `app.dir.project + "/public"` is used.
         *
         * If `config.disableStaticFiles` is `true`, `app.dir.staticFiles` is `null` and static file handling is not automatically configured.
         */
        staticFiles: string;
        /**
         * The app's views directory.
         *
         * If a value is not provided in `config.viewsDir`, `app.dir.project + "/views"` is used.
         *
         * If `config.disableViews` is `true`, `app.dir.views` is `null` and the EJS engine is not automatically configured.
         */
        views: string;
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
        routes: string[];
    };
    /**
     * The actual Express.js app.
     */
    express: express.Express;
    /**
     * Provides basic `Promise` wrappers around common file system operations, with relatives paths using `app.dir.project` as the base directory.
     *
     * Refer to https://nodejs.org/docs/latest-v14.x/api/fs.html for more information.
     */
    fileSystem: FileSystem;
    /**
     * Provides basic methods to send and receive JSON objects from remote servers.
     */
    jsonRequest: JSONRequest;
    /**
     * Provides a way to connect to the database, as specified by `config.sqlConfig`, by calling `app.sql.connect()`.
     *
     * If `config.sqlConfig` is not provided, `app.sql` will be `null`.
     */
    sql: Sql;
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
    run: (config?: Config) => Promise<void>;
};
export = app;

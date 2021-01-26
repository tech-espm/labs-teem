/// <reference types="node" />
import express = require("express");
import fs = require("fs");
import { UploadedFile as UF } from "./fileSystem";
import { JSONResponse as JSONRes, StringResponse as StringRes, BufferResponse as BufferRes } from "./request";
import type { PoolConfig } from "mysql";
import type { ServeStaticOptions } from "serve-static";
import type { SqlInterface } from "./sql";
declare namespace app {
    interface JSONResponse extends JSONRes {
    }
    interface StringResponse extends StringRes {
    }
    interface BufferResponse extends BufferRes {
    }
    interface UploadedFile extends UF {
    }
    interface UploadedFiles {
        [fieldname: string]: UploadedFile;
    }
    interface Request extends express.Request {
        uploadedFiles?: UploadedFiles;
        uploadedFilesArray?: UploadedFile[];
    }
    interface Response extends express.Response {
    }
    interface NextFunction extends express.NextFunction {
    }
    interface Sql extends SqlInterface {
    }
}
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
    saveUploadedFile(projectRelativePath: string, uploadedFile: app.UploadedFile, mode?: fs.Mode): Promise<void>;
    saveBufferToNewFile(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
    saveTextToNewFile(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
    saveUploadedFileToNewFile(projectRelativePath: string, uploadedFile: app.UploadedFile, mode?: fs.Mode): Promise<void>;
    appendBuffer(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
    appendText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
    appendBufferToExistingFile(projectRelativePath: string, buffer: Buffer): Promise<void>;
    appendTextToExistingFile(projectRelativePath: string, text: string, encoding?: BufferEncoding): Promise<void>;
}
interface JSONRequest {
    delete(url: string, headers?: any): Promise<app.JSONResponse>;
    deleteObject(url: string, object: any, headers?: any): Promise<app.JSONResponse>;
    deleteBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.JSONResponse>;
    get(url: string, headers?: any): Promise<app.JSONResponse>;
    patch(url: string, object: any, headers?: any): Promise<app.JSONResponse>;
    patchBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.JSONResponse>;
    post(url: string, object: any, headers?: any): Promise<app.JSONResponse>;
    postBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.JSONResponse>;
    put(url: string, object: any, headers?: any): Promise<app.JSONResponse>;
    putBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.JSONResponse>;
}
interface StringRequest {
    delete(url: string, headers?: any): Promise<app.StringResponse>;
    deleteObject(url: string, object: any, headers?: any): Promise<app.StringResponse>;
    deleteBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.StringResponse>;
    get(url: string, headers?: any): Promise<app.StringResponse>;
    patch(url: string, object: any, headers?: any): Promise<app.StringResponse>;
    patchBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.StringResponse>;
    post(url: string, object: any, headers?: any): Promise<app.StringResponse>;
    postBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.StringResponse>;
    put(url: string, object: any, headers?: any): Promise<app.StringResponse>;
    putBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.StringResponse>;
}
interface BufferRequest {
    delete(url: string, headers?: any): Promise<app.BufferResponse>;
    deleteObject(url: string, object: any, headers?: any): Promise<app.BufferResponse>;
    deleteBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.BufferResponse>;
    get(url: string, headers?: any): Promise<app.BufferResponse>;
    patch(url: string, object: any, headers?: any): Promise<app.BufferResponse>;
    patchBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.BufferResponse>;
    post(url: string, object: any, headers?: any): Promise<app.BufferResponse>;
    postBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.BufferResponse>;
    put(url: string, object: any, headers?: any): Promise<app.BufferResponse>;
    putBuffer(url: string, body: Buffer, contentType: string, headers?: any): Promise<app.BufferResponse>;
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
    enableDynamicCompression?: boolean;
    disableStaticFiles?: boolean;
    disableViews?: boolean;
    disableRoutes?: boolean;
    disableCookies?: boolean;
    disableBodyParser?: boolean;
    disableFileUpload?: boolean;
    disableNoCacheHeader?: boolean;
    projectDir?: string;
    mainModuleDir?: string;
    staticFilesDir?: string;
    viewsDir?: string;
    routesDir?: string[];
    staticFilesConfig?: ServeStaticOptions;
    viewsCacheSize?: number;
    bodyParserLimit?: number;
    logRoutesToConsole?: boolean;
    useClassNamesAsRoutes?: boolean;
    allMethodsRoutesAllByDefault?: boolean;
    allMethodsRoutesHiddenByDefault?: boolean;
    initCallback?: () => void;
    beforeRouteCallback?: () => void;
    afterRouteCallback?: () => void;
    errorHandler?: ErrorHandler;
    htmlErrorHandler?: ErrorHandler;
    setupOnly?: boolean;
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
        /**
         * Specifies one or more middlewares to be used with the method's route.
         *
         * For example, to a single middleware:
         *
         * ```ts
         * class Order {
         *     '@'app.route.middleware(myMiddleware())
         *     public m1(req: app.Request, res: app.Response): void {
         *         ...
         *     }
         * }
         * ```
         *
         * When adding two or more middlewares, they will be executed in the same order they were passed:
         *
         * ```ts
         * class Order {
         *     '@'app.route.middleware(firstMiddleware(), secondMiddleware(), thridMiddleware())
         *     public m1(req: app.Request, res: app.Response): void {
         *         ...
         *     }
         * }
         * ```
         *
         * The @ character MUST NOT be placed between '' in the actual code.
         *
         * Refer to https://expressjs.com/en/guide/using-middleware.html for more information on middlewares.
         * @param middleware One or more middlewares to be used with the method's route.
         */
        middleware: (...middleware: any[]) => MethodDecorator;
        /**
         * Indicates that files could be uploaded to the server through this route.
         *
         * Internally, this is done using the package multer (https://www.npmjs.com/package/multer).
         *
         * In order to make this feature work, you must make a request using HTTP method `DELETE`, `PATCH`, `POST` or `PUT`.
         *
         * That means at least one of the following decorators must be used:
         *
         * - `@app.http.all()`
         * - `@app.http.delete()`
         * - `@app.http.patch()`
         * - `@app.http.post()`
         * - `@app.http.put()`
         *
         * Also, if using a `<form>` element, it must have the attribute `enctype="multipart/form-data"`, like in the example below:
         *
         * ```html
         * <form method="post" action="route/m1" enctype="multipart/form-data" id="myForm">
         *     <div>
         *         <label for="name">Name</label>
         *         <input name="name" type="text" />
         *     </div>
         *     <div>
         *         <label for="address">Address</label>
         *         <input name="address" type="text" />
         *     </div>
         *     <div>
         *         <label for="avatar">Avatar</label>
         *         <input name="avatar" type="file" accept="image/*" />
         *     </div>
         *     <div>
         *         <input type="submit" value="Sign Up" />
         *     </div>
         * </form>
         * ```
         *
         * Alternatively you can submit the form using JavaScript (pure or through third-party libraries, such as jQuery) like in the example below:
         *
         * ```js
         * var form = document.getElementById("myForm");
         *
         * var formData = new FormData(form);
         *
         * $.ajax({
         *     url: "route/m1",
         *     method: "post",
         *     data: formData,
         *     contentType: false,
         *     processData: false,
         *     success: function () { ... },
         *     error: function () { ... }
         * });
         * ```
         *
         * Refer to https://api.jquery.com/jquery.ajax/ and to https://developer.mozilla.org/en-US/docs/Web/API/FormData for more information on the API's used in the JavaScript example above.
         *
         * Then, you can use `req.uploadedFiles` or `req.uploadedFilesArray` to access the uploaded file(s).
         *
         * `req.uploadedFiles` is a dictionary from which you can access the uploaded file(s) by the `name` attribute used in the `<input>` element.
         *
         * `req.uploadedFilesArray` is an array from which you can access the uploaded file(s) by their numeric index. This is useful if you need to receive more than one file with the same `name` attribute, because in such cases, `req.uploadedFiles` will only hold the first uploaded file with a given `name` attribute.
         *
         * The code below is an example of how to access the file uploaded in the HTML above:
         *
         * ```ts
         * class Order {
         *     '@'app.http.post()
         *     '@'app.route.fileUpload()
         *     public m1(req: app.Request, res: app.Response): void {
         *         // Accessing the files by their name
         *         console.log(req.uploadedFiles.avatar.size);
         *
         *         // Iterating through the array
         *         for (let i = 0; i < req.uploadedFilesArray.length; i++) {
         *             console.log(req.uploadedFilesArray[i].size);
         *         }
         *     }
         * }
         * ```
         *
         * In a real code you should always check for the existence of a file before using it, because it could be `undefined` if the user fails to actually send a file:
         *
         * ```ts
         * class Order {
         *     '@'app.http.post()
         *     '@'app.route.fileUpload()
         *     public m1(req: app.Request, res: app.Response): void {
         *         if (!req.uploadedFiles.avatar) {
         *             // User did not send the file
         *         } else {
         *             // File has been sent
         *         }
         *     }
         * }
         * ```
         *
         * If a value is given for the parameter `limitFileSize`, and the user sends a file larger than `limitFileSize`, the properties `errorCode` and `errorMessage` will be set, indicating the presence of an error in the file. Error codes and messages come directly from multer.
         *
         * When a value is not provided for `limitFileSize`, 10MiB (10485760 bytes) is used.
         *
         * ```ts
         * class Order {
         *     '@'app.http.post()
         *     '@'app.route.fileUpload(500000)
         *     public m1(req: app.Request, res: app.Response): void {
         *         if (!req.uploadedFiles.avatar) {
         *             // User did not send the file
         *         } else if (req.uploadedFiles.avatar.errorCode) {
         *             // File has been sent, but its size exceeds 500000 bytes
         *         } else {
         *             // File has been sent OK
         *         }
         *     }
         * }
         * ```
         *
         * You can access the file's contents directly through its `buffer` or you can save the file in disk:
         *
         * ```ts
         * class Order {
         *     '@'app.http.post()
         *     '@'app.route.fileUpload(500000)
         *     public m1(req: app.Request, res: app.Response): void {
         *         if (!req.uploadedFiles.avatar) {
         *             // User did not send the file
         *         } else if (req.uploadedFiles.avatar.errorCode) {
         *             // File has been sent, but its size exceeds 500000 bytes
         *         } else {
         *             app.fileSystem.saveBuffer("avatars/123.jpg", req.uploadedFiles.avatar.buffer);
         *         }
         *     }
         * }
         * ```
         *
         * Since all files are stored in memory, depending on the amount of files uploaded to the server during a given period of time and depending on the size of the files, this approach could cause too much pressure on the server's memory. In such cases it is advisable to use multer directly as any other middleware (using `@app.route.middleware`) and configure it in more advanced ways.
         *
         * For convenience, multer can be accessed through `app.multer` without the need for requiring it.
         *
         * If `config.disableFileUpload` is `true`, though, `app.multer` is `null` and the decorator `@app.route.fileUpload()` cannot be used.
         *
         * Please, refer to https://www.npmjs.com/package/multer for more information on the package options and use cases.
         *
         * The @ character MUST NOT be placed between '' in the actual code.
         * @param middleware One or more middlewares to be used with the method's route.
         */
        fileUpload: (limitFileSize?: number) => MethodDecorator;
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
     * If the value in `app.root` is anything other than the empty string `""`, it is adjusted so that it always starts with a `/` character, and never ends with with a `/` character.
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
    express: import("express-serve-static-core").Express;
    /**
     * Provides basic `Promise` wrappers around common file system operations, with relatives paths using `app.dir.project` as the base directory.
     *
     * Refer to https://nodejs.org/docs/latest-v14.x/api/fs.html for more information.
     */
    fileSystem: FileSystem;
    /**
     * Provides basic methods to send and receive data from remote servers.
     */
    request: {
        /**
         * Provides basic methods to send data and receive JSON objects from remote servers.
         */
        json: JSONRequest;
        /**
         * Provides basic methods to send data and receive strings from remote servers.
         */
        string: StringRequest;
        /**
         * Provides basic methods to send data and receive raw buffers from remote servers.
         */
        buffer: BufferRequest;
    };
    /**
     * Provides a way to connect to the database, as specified by `config.sqlConfig`, by calling `app.sql.connect()`.
     *
     * If `config.sqlConfig` is not provided, `app.sql` will be `null`.
     */
    sql: Sql;
    /**
     * Convenience for accessing multer package.
     *
     * Please, refer to https://www.npmjs.com/package/multer for more information on the package options and use cases.
     *
     * If `config.disableFileUpload` is `true`, `app.multer` will be `null`.
     */
    multer: any;
    /**
     * Creates, configures and starts listening the Express.js app.
     *
     * For more advanced scenarios, such as using WebSockets, it is advisable to set `config.setupOnly = true`, which makes `run()` not to call `expressApp.listen()` at the end of the setup process.
     * @param config Optional settings used to configure the routes, paths and so on.
     */
    run: (config?: Config) => void;
};
export = app;

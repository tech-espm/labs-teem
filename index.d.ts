/// <reference types="node" />
import express = require("express");
import fs = require("fs");
import { UploadedFile as UF } from "./fileSystem";
import { RequestOptions, CommonResponse as CommonRes, JSONResponse as JSONRes, StringResponse as StringRes, BufferResponse as BufferRes } from "./request";
import type { PoolOptions } from "mysql2";
import type { ServeStaticOptions } from "serve-static";
import type { URL } from "url";
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
	interface Config {
		/**
			* The root path where this app is located in the actual server, in case the server hosts several apps in a single domain.
			*
			* For example, if the app is the only one hosted by the server, and is located at the root path, such as `example.com`, `config.root` should be an empty string `""`.
			*
			* On the other hand, if the app is hosted by the server alongside other apps, such as `example.com/app1`, `config.root` should be `"/app1"`.
			*
			* If a value is not provided in `config.root`, the empty string `""` is used.
			*
			* During the execution of `app.run()`, `config.root` is copied into `app.root`.
			*
			* If the value in `config.root` is anything other than the empty string `""`, it is adjusted so that it always starts with a `/` character, and never ends with with a `/` character.
			*/
		root?: string | null;
		/**
			* The static root path is the virtual directory where this app's static files are located. This path is concatenated with `app.root` to produce the actual prefix used to locate the files.
			*
			* For example, if `config.staticRoot` is `"/public"` and `config.root` is `"/app1"`, `app.staticRoot` will be `"/app1/public"` and it will be assumed that all public static files are located under the virtual path `/app1/public`.
			*
			* Assuming there is an image physically located at `/project dir/public/images/avatar.jpg` and that the project is hosted at `example.com`, if `app.staticRoot` is `"/myPublicFiles"`, the image `avatar.jpg` will be accessible from the URL `http://example.com/myPublicFiles/images/avatar.jpg`.
			* On the other hand, if `app.staticRoot` is an empty string `""`, the image `avatar.jpg` will be accessible from the URL `http://example.com/images/avatar.jpg`.
			*
			* `app.staticRoot` is NOT automatically set and its value comes from `config.root` and `config.staticRoot`. If a value is not provided in `config.staticRoot`, `"/public"` is used.
			*
			* If the value in `config.staticRoot` is anything other than the empty string `""`, it is adjusted so that it always starts with a `/` character, and never ends with with a `/` character.
			*/
		staticRoot?: string | null;
		/**
			* The IP address used when setting up the server.
			*
			* If a value is not provided in `config.localIp`, `127.0.0.1` is used.
			*/
		localIp?: string | null;
		/**
			* The TCP port used when setting up the server.
			*
			* If a value is not provided in `config.port`, `3000` is used.
			*/
		port?: number | null;
		/**
			* Configuration used to create the connection pool from where all MySQL connections are served when calling `app.sql.connect()`.
			*
			* If `config.sqlConfig` is not provided, `app.sql` will be `null`.
			*
			* A typical configuration looks like
			*
			* ```ts
			* {
			*     connectionLimit: 30,
			*     waitForConnections: true,
			*     charset: "utf8mb4",
			*     host: "ip-or-hostname",
			*     port: 3306,
			*     user: "username",
			*     password: "your-password",
			*     database: "database-name"
			* }
			* ```
			*
			* Refer to https://www.npmjs.com/package/mysql2#using-connection-pools for more information on the available options.
			*/
		sqlConfig?: PoolOptions | null;
		/**
			* Enables the compression of all responses produced by routes and middleware functions (static files are not affected by this flag, as they are not compressed by default).
			*
			* There are great discussions about using or not compression and about serving static files directly from Node.js/Express.
			*
			* Refer to the following links for more information:
			*
			* - https://expressjs.com/en/advanced/best-practice-performance.html#use-gzip-compression
			* - https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy
			* - https://expressjs.com/en/4x/api.html#express.static
			* - https://nodejs.org/api/zlib.html#zlib_compressing_http_requests_and_responses
			*/
		enableDynamicCompression?: boolean | null;
		/**
			* Disables serving static files directly from the app.
			*
			* Static files are served using `express.static()` middleware.
			*
			* There are great discussions about serving static files directly from Node.js/Express.
			*
			* Refer to the following links for more information:
			*
			* - https://expressjs.com/en/starter/static-files.html
			* - https://expressjs.com/en/4x/api.html#express.static
			* - https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy
			*/
		disableStaticFiles?: boolean | null;
		/**
			* Disables the default view engine (EJS).
			*
			* If `config.disableViews` is `true`, `app.dir.views` will be `null` and the EJS engine will not be automatically configured.
			*
			* When views are enabled, the package express-ejs-layouts is also automatically enabled to provide template/layout support.
			*
			* Refer to the following links for more information:
			*
			* - https://www.npmjs.com/package/ejs
			* - https://www.npmjs.com/package/express-ejs-layouts
			*/
		disableViews?: boolean | null;
		/**
			* Disables automatic route creation.
			*
			* If `config.disableRoutes` is `true`, `app.dir.routes` will be `[]` and the routing will not be automatically configured.
			*/
		disableRoutes?: boolean | null;
		/**
			* Disables the cookie-parser middleware.
			*
			* Refer to https://www.npmjs.com/package/cookie-parser for more information.
			*/
		disableCookies?: boolean | null;
		/**
			* Disables JSON and urlencoded middleware functions.
			*
			* When enabled, they are responsible for parsing JSON and urlencoded payloads of routes marked with any of the following decorators:
			*
			* - `@app.http.all()`
			* - `@app.http.delete()`
			* - `@app.http.patch()`
			* - `@app.http.post()`
			* - `@app.http.put()`
			*
			* If the `@app.route.formData()` decorator is used on a route, both JSON and urlencoded middleware functions are ignored, as the multer package takes place.
			*
			* Refer to the following links for more information:
			*
			* - http://expressjs.com/en/4x/api.html#express.json
			* - http://expressjs.com/en/4x/api.html#express.urlencoded
			*/
		disableBodyParser?: boolean | null;
		/**
			* Disables the handling of bodies with `multipart/form-data` encoding (which includes files uploaded through forms and FormData objects).
			*
			* When enabled, a route must be marked with the `@app.route.formData()` decorator for the file handling to actually take place.
			*
			* The actual handling is performed by the multer package.
			*
			* Refer to https://www.npmjs.com/package/multer for more information on the package options and use cases.
			*/
		disableFormData?: boolean | null;
		/**
			* Disables the middleware function that sends a few HTTP headers to prevent caching of all dynamic responses.
			*
			* The actual headers sent are:
			*
			* ```
			* Cache-Control: private, no-cache, no-store, must-revalidate
			* Expires: -1
			* Pragma: no-cache
			* ```
			*/
		disableNoCacheHeader?: boolean | null;
		/**
			* The directory where the main app's module is located.
			*
			* If a value is not provided in `config.mainModuleDir`, the directory of the module calling `app.run()` is used.
			*
			* Using `require.main.path` does not work on some cloud providers, because they perform additional requires of their own before actually executing the app's main file (like `app.js`, `server.js` or `index.js`).
			*
			* `app.dir.mainModule` is used as `app.dir.routes`'s base directory when `config.routesDir` is not provided.
			*/
		mainModuleDir?: string | null;
		/**
			* The app's "project" directory.
			*
			* If a value is not provided in `config.projectDir`, `app.dir.project` will contain the same value as `app.dir.initial`.
			*
			* `app.dir.project` is used as `app.dir.staticFiles`'s and `app.dir.views`'s base directory when `config.staticFilesDir` / `config.viewsDir` are not provided.
			*
			* `app.dir.project` is also used as the base directory for all `app.fileSystem` methods.
			*/
		projectDir?: string | null;
		/**
			* The app's static files directory.
			*
			* If a value is not provided in `config.staticFilesDir`, `app.dir.project + "/public"` is used.
			*
			* If `config.disableStaticFiles` is `true`, `app.dir.staticFiles` will be `null` and static file handling will not be automatically configured, regardless of the value provided in `config.staticFilesDir`.
			*
			* There are great discussions about serving static files directly from Node.js/Express.
			*
			* Refer to the following links for more information:
			*
			* - https://expressjs.com/en/starter/static-files.html
			* - https://expressjs.com/en/4x/api.html#express.static
			* - https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy
			*/
		staticFilesDir?: string | null;
		/**
			* The app's views directory.
			*
			* If a value is not provided in `config.viewsDir`, `app.dir.project + "/views"` is used.
			*
			* If `config.disableViews` is `true`, `app.dir.views` will be `null` and the EJS engine will not be automatically configured, regardless of the value provided in `config.viewsDir`.
			*/
		viewsDir?: string | null;
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
			* If `config.disableRoutes` is `true`, `app.dir.routes` will be `[]` and the routing will not be automatically configured, regardless of the value provided in `config.routesDir`.
			*/
		routesDir?: string[] | null;
		/**
			* Configuration used to create `express.static()` middleware, responsible for serving static files.
			*
			* If `config.disableStaticFiles` is `true`, `config.staticFilesConfig` will be ignored.
			*
			* When a value is not provided for `config.staticFilesConfig`, the following configuration is used:
			*
			* ```ts
			* {
			*     cacheControl: true,
			*     etag: false,
			*     immutable: true,
			*     maxAge: "365d"
			* }
			* ```
			*
			* There are great discussions about serving static files directly from Node.js/Express.
			*
			* Refer to the following links for more information:
			*
			* - https://expressjs.com/en/starter/static-files.html
			* - https://expressjs.com/en/4x/api.html#express.static
			* - https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy
			*/
		staticFilesConfig?: ServeStaticOptions | null;
		/**
			* Amount of views to cache in memory, when using the default view engine (EJS).
			*
			* If a value is not provided, `200` is used.
			*
			* Refer to https://www.npmjs.com/package/ejs#caching for more information.
			*/
		viewsCacheSize?: number | null;
		/**
			* Maximum acceptable payload size used by the JSON and urlencoded middleware functions.
			*
			* If a value is not provided, `10485760` is used (10MiB).
			*
			* Refer to the following links for more information:
			*
			* - http://expressjs.com/en/4x/api.html#express.json
			* - http://expressjs.com/en/4x/api.html#express.urlencoded
			*/
		bodyParserLimit?: number | null;
		/**
			* Enables logging to the console all routes that were automatically created.
			*
			* Useful for debugging purposes.
			*/
		logRoutesToConsole?: boolean | null;
		/**
			* Flag that indicates if class names are to be used, instead of the filename, the generate a route.
			*/
		useClassNamesAsRoutes?: boolean | null;
		/**
			* Forces the internal router to use the `@app.http.all()` decorator for methods without any `app.http` decorators.
			*
			* The internal router's default behavior is to use `@app.http.get()` decorator for methods without any `app.http` decorators.
			*
			* If `config.allMethodsRoutesHiddenByDefault` is `true`, `config.allMethodsRoutesAllByDefault` will be ignored.
			*/
		allMethodsRoutesAllByDefault?: boolean | null;
		/**
			* Forces the internal router to use the `@app.http.hidden()` decorator for methods without any `app.http` decorators.
			*
			* The internal router's default behavior is to use `@app.http.get()` decorator for methods without any `app.http` decorators.
			*
			* If `config.allMethodsRoutesHiddenByDefault` is `true`, `config.allMethodsRoutesAllByDefault` will be ignored.
			*/
		allMethodsRoutesHiddenByDefault?: boolean | null;
		/**
			* Function that is executed before any middleware functions are registered.
			*
			* There are 4 callbacks in `config` and they are executed in the following moments:
			*
			* - [Initial setup and directory resolution]
			* - config.onInit()
			* - [Static file and other middleware setup]
			* - config.onBeforeRoute()
			* - [Route creation/registration]
			* - config.onAfterRoute()
			* - config.onFinish()
			*
			* When `config.onFinish` is not provided, `app.express.listen()` is called instead.
			*/
		onInit?: (() => Promise<void> | void) | null;
		/**
			* Function that is executed after all middleware functions have been registered, but before any routes are created.
			*
			* There are 4 callbacks in `config` and they are executed in the following moments:
			*
			* - [Initial setup and directory resolution]
			* - config.onInit()
			* - [Static file and other middleware setup]
			* - config.onBeforeRoute()
			* - [Route creation/registration]
			* - config.onAfterRoute()
			* - config.onFinish()
			*
			* When `config.onFinish` is not provided, `app.express.listen()` is called instead.
			*/
		onBeforeRoute?: (() => Promise<void> | void) | null;
		/**
			* Function that is executed after all routes have been created.
			*
			* There are 4 callbacks in `config` and they are executed in the following moments:
			*
			* - [Initial setup and directory resolution]
			* - config.onInit()
			* - [Static file and other middleware setup]
			* - config.onBeforeRoute()
			* - [Route creation/registration]
			* - config.onAfterRoute()
			* - config.onFinish()
			*
			* When `config.onFinish` is not provided, `app.express.listen()` is called instead.
			*/
		onAfterRoute?: (() => Promise<void> | void) | null;
		/**
			* Function that is executed at the end of the setup process.
			*
			* There are 4 callbacks in `config` and they are executed in the following moments:
			*
			* - [Initial setup and directory resolution]
			* - config.onInit()
			* - [Static file and other middleware setup]
			* - config.onBeforeRoute()
			* - [Route creation/registration]
			* - config.onAfterRoute()
			* - config.onFinish()
			*
			* When `config.onFinish` is not provided, `app.express.listen()` is called instead.
			*
			* Providing a function to `config.onFinish` causes `app.run()` will not start the server by calling `app.express.listen()` at the end of the setup process, allowing for more advanced scenarios, such as using WebSockets.
			*
			* Do not forget to manually call `app.express.listen()`, or another equivalent method, inside `config.onFinish`.
			*
			* For example, the code below could be used to integrate the app with Socket.IO:
			*
			* ```ts
			* import app = require("teem");
			* import http = require("http");
			* import socketio = require("socket.io");
			*
			* app.run({
			*     ... // Other options
			*
			*     onFinish: function () {
			*         const server = new http.Server(app.express);
			*         const io = new socketio.Server(server);
			*
			*         io.on("connection", function (socket: any) {
			*             console.log("New user connected");
			*         });
			*
			*         server.listen(app.port, app.localIp, function () {
			*             console.log(`Server listening on ${app.localIp}:${app.port}`);
			*         });
			*     }
			* });
			* ```
			*
			* Refer to https://socket.io for more information on the Socket.IO framework.
			*/
		onFinish?: (() => Promise<void> | void) | null;
		/**
			* Function responsible for returning a response to the client in case of errors.
			*
			* When `config.errorHandler` is not provided, a JSON string with the error message is returned for requests made to routes containing the string `/api/` or for requests with `application/json` in the `accept` header, or a simple HTML page in other cases.
			*
			* The function provided to `config.errorHandler` must have the following signature `(err: any, req: app.Request, res: app.Response, next: app.NextFunction)`.
			*
			* For example:
			*
			* ```ts
			* app.run({
			*     ... // Other options
			*
			*     errorHandler: function (err: any, req: app.Request, res: app.Response, next: app.NextFunction) {
			*         res.render("shared/error", { message: err.message || "Unknown error" });
			*     }
			* });
			* ```
			*/
		errorHandler?: ErrorHandler | null;
		/**
			* Function responsible for returning a response to the client in case of errors.
			*
			* When `config.htmlErrorHandler` is not provided, a simple HTML page is returned to the client.
			*
			* The function provided to `config.htmlErrorHandler` must have the following signature `(err: any, req: app.Request, res: app.Response, next: app.NextFunction)`.
			*
			* Even if a function is provided to `config.htmlErrorHandler`, it is not called for requests made to routes containing the string `/api/` or for requests with `application/json` in the `accept` header.
			*
			* If a full error handler is provided in `config.errorHandler`, `config.htmlErrorHandler` is ignored.
			*
			* For example:
			*
			* ```ts
			* app.run({
			*     ... // Other options
			*
			*     htmlErrorHandler: function (err: any, req: app.Request, res: app.Response, next: app.NextFunction) {
			*         res.render("shared/error", { message: err.message || "Unknown error" });
			*     }
			* });
			* ```
			*/
		htmlErrorHandler?: ErrorHandler | null;
	}
}
interface FileSystem {
	/**
		* Returns the absolute path of the given relative path.
		*
		* `projectRelativePath` is considered to be relative to `app.dir.project` even if starts with a slash `/`.
		*
		* For example, if `app.dir.project` is `/home/my-user/projects/example` and `projectRelativePath` is `a/b/img.jpg`, `app.fileSystem.absolutePath()` will return `/home/my-user/projects/example/a/b/img.jpg`.
		*
		* If `app.dir.project` is `/home/my-user/projects/example` and `projectRelativePath` is `/a/b/img.jpg`, `app.fileSystem.absolutePath()` will also return `/home/my-user/projects/example/a/b/img.jpg`.
		*
		* The same rule applies to Windows systems: if `app.dir.project` is `C:\Users\MyUser\Projects\Example\` and `projectRelativePath` is `a\b\img.jpg`, `app.fileSystem.absolutePath()` will return `C:\Users\MyUser\Projects\Example\a\b\img.jpg`.
		*
		* `app.fileSystem.absolutePath()` does not check if the path or any part of it exists.
		*
		* `/` and `\` are adjusted automatically in `projectRelativePath`, so that both `a/b/img.jpg` and `a\b\img.jpg` work correctly on Windows, Mac and Linux systems.
		*
		* If `projectRelativePath` starts with `../` or `..\`, or if it contains `/../` or `\..\`, an exception will be thrown.
		*
		* @param projectRelativePath Path relative to `app.dir.projectDir`.
		*/
	absolutePath(projectRelativePath: string): string;
	/**
		* Validates the given filename and returns `null` if the filename is not considered to be safe for creating a file. If the filename is considered to be safe, `app.fileSystem.validateUploadedFilename()` returns `filename.trim()`.
		*
		* Although `app.fileSystem.validateUploadedFilename()` is primarily intended to validate a filename provided by the end user before actually creating such file on the local file system, that practice is highly discouraged.
		*
		* It is usually recommended to generate a numeric/textual id, for example in a database, associate the given filename within that record, and store the file contents in a file named after the generated id. For example:
		*
		* ```ts
		* class Order {
		*     '@'app.http.post()
		*     '@'app.route.formData()
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*         // Save the name provided by the user in the database and generate an id
		*         const id = await createDatabaseRecordAndGenerateId(req.uploadedFiles.image.originalname);
		*
		*         // Save the file using the generated id as its name
		*         await app.fileSystem.saveUploadedFile(`relative/path/to/images/${id}`, req.uploadedFiles.image);
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*
		* If it is absolutely necessary to use the given filename, it can be validated as in the following example:
		*
		* ```ts
		* const filename = app.fileSystem.validateUploadedFilename(req.uploadedFiles.image.originalname);
		* if (filename) {
		*     // Use the string in filename
		* } else {
		*     // An invalid filename was given
		* }
		* ```
		*
		* Any string can be validated, not only `app.UploadedFile.originalname`:
		*
		* ```ts
		* const filename = app.fileSystem.validateUploadedFilename(req.body.filenameField);
		* if (filename) {
		*     // Use the string in filename
		* } else {
		*     // An invalid filename was given
		* }
		* ```
		*
		* The rules used are basicaly a mix between safety, cross-OS compatibility and actual rules. Refer to https://stackoverflow.com/q/1976007/3569421 for a discussion on that subject.
		*
		* @param filename Filename to be validated.
		*/
	validateUploadedFilename(filename: string): string;
	/**
		* Creates a new directory located at `projectRelativePath`.
		*
		* If `options` is an object containing the property `recursive` set to `true`, non-existing intermediate directories are also created as necessary, otherwise, only the final directory is created.
		*
		* It is not an error to try to create a directory that already exists.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the directory to be created. Refer to `app.fileSystem.absolutePath()` for more information.
		* @param options Optional object with the options to create the directory (Refer to https://nodejs.org/api/fs.html#fs_fs_mkdir_path_options_callback for more information on the options).
		*/
	createDirectory(projectRelativePath: string, options?: fs.Mode | fs.MakeDirectoryOptions): Promise<void>;
	/**
		* Deletes the directory given by `projectRelativePath`.
		*
		* The method fails if the directory does not exist, if it is not empty or if it cannot be deleted.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the directory to be deleted. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		*/
	deleteDirectory(projectRelativePath: string): Promise<void>;
	/**
		* Deletes the directory given by `projectRelativePath` along with its contents.
		*
		* The method fails if the directory does not exist, if it cannot be deleted or if it is not possible to delete one of its files or directories.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the directory to be deleted. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		*/
	deleteFilesAndDirectory(projectRelativePath: string): Promise<void>;
	/**
		* Renames the file or directory given by `currentProjectRelativePath`.
		*
		* The method fails if `currentProjectRelativePath` does not exist, if it cannot be renamed or if `newProjectRelativePath` already exists.
		*
		* @param currentProjectRelativePath Path, relative to `app.dir.projectDir`, of the file/directory to be renamed. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param newProjectRelativePath New path, relative to `app.dir.projectDir`, of the file/directory to be renamed. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		*/
	rename(currentProjectRelativePath: string, newProjectRelativePath: string): Promise<void>;
	/**
		* Deletes the file given by `projectRelativePath`.
		*
		* The method fails if `projectRelativePath` does not exist or cannot be deleted.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be deleted. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		*/
	deleteFile(projectRelativePath: string): Promise<void>;
	/**
		* Checks if the file or directory given by `projectRelativePath` exists and can be accessed by the user who owns the current Node.js process.
		*
		* Refer to https://nodejs.org/api/fs.html#fs_fs_access_path_mode_callback for more information.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file or directory to be checked. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		*/
	exists(projectRelativePath: string): Promise<boolean>;
	/**
		* Creates a new empty file.
		*
		* The method fails if `projectRelativePath` already exists.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the new file to be created. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param mode Optional mode for the file to be created (Refer to https://nodejs.org/api/fs.html#fs_file_modes for more information on the available modes).
		*/
	createNewEmptyFile(projectRelativePath: string, mode?: fs.Mode): Promise<void>;
	/**
		* Saves the given buffer to a file.
		*
		* The file is created (if it does not exist) or is completely replaced (if it already exists).
		*
		* The method fails if `projectRelativePath` cannot be written to.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be written to. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param buffer Buffer to be written to the file.
		* @param mode Optional mode for the file to be written to (Refer to https://nodejs.org/api/fs.html#fs_file_modes for more information on the available modes).
		*/
	saveBuffer(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
	/**
		* Saves the given text to a file.
		*
		* The file is created (if it does not exist) or is completely replaced (if it already exists).
		*
		* The method fails if `projectRelativePath` cannot be written to.
		*
		* If no encoding is provided, `utf8` is used.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be written to. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param text Text to be written to the file.
		* @param mode Optional mode for the file to be written to (Refer to https://nodejs.org/api/fs.html#fs_file_modes for more information on the available modes).
		* @param encoding Optional encoding to be used when converting `text` into bytes (Refer to https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings for more information on the available encodings).
		*/
	saveText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
	/**
		* Saves the contents of an uploaded file to a file.
		*
		* The file is created (if it does not exist) or is completely replaced (if it already exists).
		*
		* The method fails if `projectRelativePath` cannot be written to.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be written to. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param uploadedFile Uploaded file to be saved.
		* @param mode Optional mode for the file to be written to (Refer to https://nodejs.org/api/fs.html#fs_file_modes for more information on the available modes).
		*/
	saveUploadedFile(projectRelativePath: string, uploadedFile: app.UploadedFile, mode?: fs.Mode): Promise<void>;
	/**
		* Saves the given buffer to a new file.
		*
		* The method fails if `projectRelativePath` already exists.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be created. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param buffer Buffer to be written to the file.
		* @param mode Optional mode for the file to be created (Refer to https://nodejs.org/api/fs.html#fs_file_modes for more information on the available modes).
		*/
	saveBufferToNewFile(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
	/**
		* Saves the given text to a new file.
		*
		* The method fails if `projectRelativePath` already exists.
		*
		* If no encoding is provided, `utf8` is used.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be created. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param text Text to be written to the file.
		* @param mode Optional mode for the file to be created (Refer to https://nodejs.org/api/fs.html#fs_file_modes for more information on the available modes).
		* @param encoding Optional encoding to be used when converting `text` into bytes (Refer to https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings for more information on the available encodings).
		*/
	saveTextToNewFile(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
	/**
		* Saves the contents of an uploaded file to a new file.
		*
		* The method fails if `projectRelativePath` already exists.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be created. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param uploadedFile Uploaded file to be saved.
		* @param mode Optional mode for the file to be created (Refer to https://nodejs.org/api/fs.html#fs_file_modes for more information on the available modes).
		*/
	saveUploadedFileToNewFile(projectRelativePath: string, uploadedFile: app.UploadedFile, mode?: fs.Mode): Promise<void>;
	/**
		* Appends the given buffer to a file.
		*
		* The file is created (if it does not exist) or `buffer` is appended to its end (if it already exists).
		*
		* The method fails if `projectRelativePath` cannot be written to.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be appended to. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param buffer Buffer to be appended to the file.
		* @param mode Optional mode for the file to be appended to (Refer to https://nodejs.org/api/fs.html#fs_file_modes for more information on the available modes).
		*/
	appendBuffer(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
	/**
		* Appends the given text to a file.
		*
		* The file is created (if it does not exist) or `text` is appended to its end (if it already exists).
		*
		* The method fails if `projectRelativePath` cannot be written to.
		*
		* If no encoding is provided, `utf8` is used.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be appended to. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param text Text to be appended to the file.
		* @param mode Optional mode for the file to be appended to (Refer to https://nodejs.org/api/fs.html#fs_file_modes for more information on the available modes).
		* @param encoding Optional encoding to be used when converting `text` into bytes (Refer to https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings for more information on the available encodings).
		*/
	appendText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
	/**
		* Appends the given buffer to an existing file.
		*
		* `buffer` is appended to the end of the file given by `projectRelativePath`.
		*
		* The method fails if `projectRelativePath` cannot be written to or if it does not exist.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be appended to. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param buffer Buffer to be appended to the file.
		*/
	appendBufferToExistingFile(projectRelativePath: string, buffer: Buffer): Promise<void>;
	/**
		* Appends the given text to an existing file.
		*
		* `text` is appended to the end of the file given by `projectRelativePath`.
		*
		* The method fails if `projectRelativePath` cannot be written to or if it does not exist.
		*
		* If no encoding is provided, `utf8` is used.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be appended to. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param text Text to be appended to the file.
		* @param encoding Optional encoding to be used when converting `text` into bytes (Refer to https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings for more information on the available encodings).
		*/
	appendTextToExistingFile(projectRelativePath: string, text: string, encoding?: BufferEncoding): Promise<void>;
	/**
			* Reads the contents of a file as a buffer.
			*
			* The method fails if `projectRelativePath` cannot be read from or if it does not exist.
			*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be read from. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		*/
	readBufferFromExistingFile(projectRelativePath: string, mode?: fs.Mode): Promise<Buffer>;
	/**
		* Reads the contents of a file as a string.
		*
		* The method fails if `projectRelativePath` cannot be read from or if it does not exist.
		*
		* If no encoding is provided, `utf8` is used.
		*
		* @param projectRelativePath Path, relative to `app.dir.projectDir`, of the file to be read from. Refer to `app.fileSystem.absolutePath()` for more information on relative paths.
		* @param encoding Optional encoding to be used when converting bytes into text (Refer to https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings for more information on the available encodings).
		*/
	readTextFromExistingFile(projectRelativePath: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<string>;
}
interface CommonRequest<T extends CommonRes> {
	/**
		* Sends a DELETE request without a body.
		*
		* This method fails if an error happens, such as a network communication error, but resolves with an object if a server response is received, even if its status code indicates failure, such as `404` or `500`.
					*
		* @param url Complete URL of the request (including any optional query string parameters).
		* @param options Optional object containing additional settings.
		*
		* @returns A `Promise` object that will be resolved with the server response, even if its status code indicates failure, such as `404` or `500`.
		*/
	delete(url: string | URL, options?: RequestOptions): Promise<T>;
	/**
		* Sends a DELETE request with the given body.
		*
		* The value of the `Content-Type` header, indicating the type of the content in `body`, must be specified in `contentType`.
		*
		* This method fails if an error happens, such as a network communication error, but resolves with an object if a server response is received, even if its status code indicates failure, such as `404` or `500`.
					*
		* @param url Complete URL of the request (including any optional query string parameters).
					* @param body Buffer containing the body of the request.
					* @param contentType Value of the `Content-Type` header, indicating the type of the content in `body`.
		* @param options Optional object containing additional settings.
		*
		* @returns A `Promise` object that will be resolved with the server response, even if its status code indicates failure, such as `404` or `500`.
		*/
	deleteBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<T>;
	/**
		* Sends a DELETE request with an `application/json` body containing the JSON representation of `object`.
		*
		* This method fails if an error happens, such as a network communication error, but resolves with an object if a server response is received, even if its status code indicates failure, such as `404` or `500`.
					*
		* @param url Complete URL of the request (including any optional query string parameters).
					* @param object Object to be sent as the body of the request (this object is internally converted into a JSON string using `JSON.stringify()`).
		* @param options Optional object containing additional settings.
		*
		* @returns A `Promise` object that will be resolved with the server response, even if its status code indicates failure, such as `404` or `500`.
		*/
	deleteObject(url: string | URL, object: any, options?: RequestOptions): Promise<T>;
	/**
		* Sends a GET request.
		*
		* This method fails if an error happens, such as a network communication error, but resolves with an object if a server response is received, even if its status code indicates failure, such as `404` or `500`.
					*
		* @param url Complete URL of the request (including any optional query string parameters).
		* @param options Optional object containing additional settings.
		*
		* @returns A `Promise` object that will be resolved with the server response, even if its status code indicates failure, such as `404` or `500`.
		*/
	get(url: string | URL, options?: RequestOptions): Promise<T>;
	/**
		* Sends a PATCH request with the given body.
		*
		* The value of the `Content-Type` header, indicating the type of the content in `body`, must be specified in `contentType`.
		*
		* This method fails if an error happens, such as a network communication error, but resolves with an object if a server response is received, even if its status code indicates failure, such as `404` or `500`.
					*
		* @param url Complete URL of the request (including any optional query string parameters).
					* @param body Buffer containing the body of the request.
					* @param contentType Value of the `Content-Type` header, indicating the type of the content in `body`.
		* @param options Optional object containing additional settings.
		*
		* @returns A `Promise` object that will be resolved with the server response, even if its status code indicates failure, such as `404` or `500`.
		*/
	patchBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<T>;
	/**
		* Sends a PATCH request with an `application/json` body containing the JSON representation of `object`.
		*
		* This method fails if an error happens, such as a network communication error, but resolves with an object if a server response is received, even if its status code indicates failure, such as `404` or `500`.
					*
		* @param url Complete URL of the request (including any optional query string parameters).
					* @param object Object to be sent as the body of the request (this object is internally converted into a JSON string using `JSON.stringify()`).
		* @param options Optional object containing additional settings.
		*
		* @returns A `Promise` object that will be resolved with the server response, even if its status code indicates failure, such as `404` or `500`.
		*/
	patchObject(url: string | URL, object: any, options?: RequestOptions): Promise<T>;
	/**
		* Sends a POST request with the given body.
		*
		* The value of the `Content-Type` header, indicating the type of the content in `body`, must be specified in `contentType`.
		*
		* This method fails if an error happens, such as a network communication error, but resolves with an object if a server response is received, even if its status code indicates failure, such as `404` or `500`.
					*
		* @param url Complete URL of the request (including any optional query string parameters).
					* @param body Buffer containing the body of the request.
					* @param contentType Value of the `Content-Type` header, indicating the type of the content in `body`.
		* @param options Optional object containing additional settings.
		*
		* @returns A `Promise` object that will be resolved with the server response, even if its status code indicates failure, such as `404` or `500`.
		*/
	postBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<T>;
	/**
		* Sends a POST request with an `application/json` body containing the JSON representation of `object`.
		*
		* This method fails if an error happens, such as a network communication error, but resolves with an object if a server response is received, even if its status code indicates failure, such as `404` or `500`.
					*
		* @param url Complete URL of the request (including any optional query string parameters).
					* @param object Object to be sent as the body of the request (this object is internally converted into a JSON string using `JSON.stringify()`).
		* @param options Optional object containing additional settings.
		*
		* @returns A `Promise` object that will be resolved with the server response, even if its status code indicates failure, such as `404` or `500`.
		*/
	postObject(url: string | URL, object: any, options?: RequestOptions): Promise<T>;
	/**
		* Sends a PUT request with the given body.
		*
		* The value of the `Content-Type` header, indicating the type of the content in `body`, must be specified in `contentType`.
		*
		* This method fails if an error happens, such as a network communication error, but resolves with an object if a server response is received, even if its status code indicates failure, such as `404` or `500`.
					*
		* @param url Complete URL of the request (including any optional query string parameters).
					* @param body Buffer containing the body of the request.
					* @param contentType Value of the `Content-Type` header, indicating the type of the content in `body`.
		* @param options Optional object containing additional settings.
		*
		* @returns A `Promise` object that will be resolved with the server response, even if its status code indicates failure, such as `404` or `500`.
		*/
	putBuffer(url: string | URL, body: Buffer, contentType: string, options?: RequestOptions): Promise<T>;
	/**
		* Sends a PUT request with an `application/json` body containing the JSON representation of `object`.
		*
		* This method fails if an error happens, such as a network communication error, but resolves with an object if a server response is received, even if its status code indicates failure, such as `404` or `500`.
					*
		* @param url Complete URL of the request (including any optional query string parameters).
					* @param object Object to be sent as the body of the request (this object is internally converted into a JSON string using `JSON.stringify()`).
		* @param options Optional object containing additional settings.
		*
		* @returns A `Promise` object that will be resolved with the server response, even if its status code indicates failure, such as `404` or `500`.
		*/
	putObject(url: string | URL, object: any, options?: RequestOptions): Promise<T>;
}
interface JSONRequest extends CommonRequest<app.JSONResponse> {
}
interface StringRequest extends CommonRequest<app.StringResponse> {
}
interface BufferRequest extends CommonRequest<app.BufferResponse> {
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
*     public async m1() {
*         await app.sql.connect(async (sql) => {
*             ...
*             await sql.query("INSERT INTO ...");
*             ...
*         });
*     }
* }
* ```
*
* `app.sql.connect()` returns a `Promise` object that will be resolved with the value returned by the callback. For example:
*
* ```ts
* class A {
*     public async m1() {
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
		*
* @param callback Function to be executed when a connection is successfully fetched from the pool.
*
* @returns A `Promise` object that will be resolved with the value returned by the callback.
		*/
	connect<T>(callback: (sql: app.Sql) => Promise<T>): Promise<T>;
}
interface ErrorHandler {
	(err: any, req: app.Request, res: app.Response, next: app.NextFunction): Promise<void> | void;
}
interface RouteDecorators {
	/**
		* Specifies the full path to be used to prefix the routes created by the class' methods.
		*
		* If this decorator is not used, the concatenation of current file's directory (relative to `app.dir.routes`) + name is used as the prefix.
		*
		* For example, assume `app.dir.routes = ["/path/to/project/routes"]` and the class below is in the file `/path/to/project/routes/api/sales/order.js`.
		*
		* ```ts
		* class Order {
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* By default, method `Order.m1()` produces the route `/api/sales/order/m1` (or `/api/sales/Order/m1` if the setting `config.useClassNamesAsRoutes` is `true`).
		*
		* But if the `@app.route.fullClassRoute("/my/custom/route")` decorator were used, as in the example below, method `Order.m1()` would produce the route `/my/custom/route/m1`.
		*
		* ```ts
		* '@'app.route.fullClassRoute("/my/custom/route")
		* class Order {
		*     public m1(req: app.Request, res: app.Response) {
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
		*
		* @param routeFullClassRoute Full path to be used to prefix the routes created by the class' methods.
		*/
	fullClassRoute(routeFullClassRoute: string): ClassDecorator;
	/**
		* Specifies the full path to be used as the method's route, overriding everything else.
		*
		* If this decorator is not used, the concatenation of current class' route prefix + the method name is used as the route.
		*
		* For example, assume `app.dir.routes = ["/path/to/project/routes"]` and the class below is in the file `/path/to/project/routes/api/sales/order.js`.
		*
		* ```ts
		* class Order {
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* By default, method `Order.m1()` produces the route `/api/sales/order/m1` (or `/api/sales/Order/m1` if the setting `config.useClassNamesAsRoutes` is `true`).
		*
		* But if the `@app.route.fullMethodRoute("/my/custom/method/route")` decorator were used, as in the example below, method `Order.m1()` would produce the route `/my/custom/method/route`.
		*
		* ```ts
		* class Order {
		*     '@'app.route.fullMethodRoute("/my/custom/method/route")
		*     public m1(req: app.Request, res: app.Response) {
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
		*
		* @param routeFullMethodRoute Full path to be used as the method's route.
		*/
	fullMethodRoute(routeFullMethodRoute: string): MethodDecorator;
	/**
		* Specifies the name to be used when composing the class' route prefix.
		*
		* If this decorator is not used, either the actual name of the class or the current file name is used to create the class' route prefix (depending on the setting `config.useClassNamesAsRoutes`).
		*
		* For example, assume `app.dir.routes = ["/path/to/project/routes"]` and the class below is in the file `/path/to/project/routes/api/sales/order.js`.
		*
		* ```ts
		* class Order {
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* By default, method `Order.m1()` produces the route `/api/sales/order/m1` (or `/api/sales/Order/m1` if the setting `config.useClassNamesAsRoutes` is `true`).
		*
		* But if the `@app.route.className("newName")` decorator were used, as in the example below, method `Order.m1()` would produce the route `/api/sales/newName/m1` (ignoring the setting `config.useClassNamesAsRoutes`).
		*
		* ```ts
		* '@'app.route.className("newName")
		* class Order {
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*
		* The `@app.route.fullClassRoute` decorator overrides this one.
		*
		* Express.js's route parameters can be used (refer to http://expressjs.com/en/guide/routing.html for more information on that).
		*
		* When in doubt, set `config.logRoutesToConsole` to `true` to list all the routes produced during setup.
		*
		* @param routeClassName Name to be used when composing the class' route prefix.
		*/
	className(routeClassName: string): ClassDecorator;
	/**
		* Specifies the name to be used when composing the method's route.
		*
		* If this decorator is not used, the actual method's name is used to create route.
		*
		* For example, assume `app.dir.routes = ["/path/to/project/routes"]` and the class below is in the file `/path/to/project/routes/api/sales/order.js`.
		*
		* ```ts
		* class Order {
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* By default, method `Order.m1()` produces the route `/api/sales/order/m1` (or `/api/sales/Order/m1` if the setting `config.useClassNamesAsRoutes` is `true`).
		*
		* But if the `@app.route.methodName("myMethod")` decorator were used, as in the example below, method `Order.m1()` would produce the route `/api/sales/order/myMethod` (or `/api/sales/Order/myMethod` if the setting `config.useClassNamesAsRoutes` is `true` or `xxx/myMethod` if either `@app.route.fullClassRoute()` or  `@app.route.className()` decorator is used on class `Order`).
		*
		* ```ts
		* class Order {
		*     '@'app.route.methodName("myMethod")
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*
		* The `@app.route.fullMethodRoute` decorator overrides this one.
		*
		* Express.js's route parameters can be used (refer to http://expressjs.com/en/guide/routing.html for more information on that).
		*
		* When in doubt, set `config.logRoutesToConsole` to `true` to list all the routes produced during setup.
		*
		* @param routeClassName Name to be used when composing the class' route prefix.
		*/
	methodName(routeMethodName: string): MethodDecorator;
	/**
		* Specifies one or more middleware functions to be used with the method's route.
		*
		* For example, to add a single middleware:
		*
		* ```ts
		* class Order {
		*     '@'app.route.middleware(myMiddleware())
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* When adding two or more middleware functions, they will be executed in the same order they were passed:
		*
		* ```ts
		* class Order {
		*     '@'app.route.middleware(firstMiddleware(), secondMiddleware(), thridMiddleware())
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*
		* Refer to https://expressjs.com/en/guide/using-middleware.html for more information on middleware.
		*
		* @param middleware One or more middleware functions to be used with the method's route.
		*/
	middleware(...middleware: any[]): MethodDecorator;
	/**
		* Indicates that data (and possibly files) is sent to the server through this route with `multipart/form-data` encoding.
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
		*     '@'app.route.formData()
		*     public m1(req: app.Request, res: app.Response) {
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
		*     '@'app.route.formData()
		*     public m1(req: app.Request, res: app.Response) {
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
		*     '@'app.route.formData(500000)
		*     public m1(req: app.Request, res: app.Response) {
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
		* You can access the file's contents directly through its `buffer` or you can save the file to disk:
		*
		* ```ts
		* class Order {
		*     '@'app.http.post()
		*     '@'app.route.formData(500000)
		*     public m1(req: app.Request, res: app.Response) {
		*         if (!req.uploadedFiles.avatar) {
		*             // User did not send the file
		*         } else if (req.uploadedFiles.avatar.errorCode) {
		*             // File has been sent, but its size exceeds 500000 bytes
		*         } else {
		*             app.fileSystem.saveUploadedFile("avatars/123.jpg", req.uploadedFiles.avatar);
		*         }
		*     }
		* }
		* ```
		*
		* When using the `@app.route.formData()` decorator, data *MUST* be sent with `multipart/form-data` encoding, or else nothing will be received.
		*
		* Since all files are stored in memory, depending on the amount of files uploaded to the server during a given period of time and depending on the size of the files, this approach could cause too much pressure on the server's memory. In such cases it is advisable to use multer directly as any other middleware (using `@app.route.middleware`) and configure it in more advanced ways.
		*
		* For convenience, multer can be accessed through `app.multer` without the need for requiring it.
		*
		* If `config.disableFormData` is `true`, though, `app.multer` will be `null` and it will not be possible to use the `@app.route.formData()` decorator.
		*
		* Refer to https://www.npmjs.com/package/multer for more information on the package options and use cases.
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*
		* @param limitFileSize Maximum acceptable file size in bytes (10MiB, or 10485760 bytes, is used if no other value is provided).
		*/
	formData(limitFileSize?: number): MethodDecorator;
}
interface HttpDecorators {
	/**
		* Informs the class' method accepts all HTTP methods.
		*
		* For example:
		*
		* ```ts
		* class Order {
		*     '@'app.http.all()
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*/
	all(): MethodDecorator;
	/**
		* Informs the class' method accepts the HTTP method GET (can be used with any other `app.http` method decorator).
		*
		* For example:
		*
		* ```ts
		* class Order {
		*     '@'app.http.get()
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*/
	get(): MethodDecorator;
	/**
		* Informs the class' method accepts the HTTP method POST (can be used with any other `app.http` method decorator).
		*
		* For example:
		*
		* ```ts
		* class Order {
		*     '@'app.http.post()
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*/
	post(): MethodDecorator;
	/**
		* Informs the class' method accepts the HTTP method PUT (can be used with any other `app.http` method decorator).
		*
		* For example:
		*
		* ```ts
		* class Order {
		*     '@'app.http.put()
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*/
	put(): MethodDecorator;
	/**
		* Informs the class' method accepts the HTTP method DELETE (can be used with any other `app.http` method decorator).
		*
		* For example:
		*
		* ```ts
		* class Order {
		*     '@'app.http.delete()
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*/
	delete(): MethodDecorator;
	/**
		* Informs the class' method accepts the HTTP method PATCH (can be used with any other `app.http` method decorator).
		*
		* For example:
		*
		* ```ts
		* class Order {
		*     '@'app.http.patch()
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*/
	patch(): MethodDecorator;
	/**
		* Informs the class' method accepts the HTTP method OPTIONS (can be used with any other `app.http` method decorator).
		*
		* For example:
		*
		* ```ts
		* class Order {
		*     '@'app.http.options()
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*/
	options(): MethodDecorator;
	/**
		* Informs the class' method accepts the HTTP method HEAD (can be used with any other `app.http` method decorator).
		*
		* For example:
		*
		* ```ts
		* class Order {
		*     '@'app.http.head()
		*     public m1(req: app.Request, res: app.Response) {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*/
	head(): MethodDecorator;
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
		*     public m1() {
		*         ...
		*     }
		* }
		* ```
		*
		* The @ character MUST NOT be placed between '' in the actual code.
		*/
	hidden(): MethodDecorator;
}
interface RequestMethods {
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
}
interface Directories {
	/**
		* The initial working directory, obtained by calling `process.cwd()` at the beginning of the setup process.
		*
		* `app.dir.initial` does not end with a slash (`\` in Windows or `/` in Linux/Mac).
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
		*
		* `app.dir.mainModule` does not end with a slash (`\` in Windows or `/` in Linux/Mac), even if the value provided in `config.mainModuleDir` does.
		*/
	mainModule: string;
	/**
		* The app's "project" directory.
		*
		* If a value is not provided in `config.projectDir`, `app.dir.project` will contain the same value as `app.dir.initial`.
		*
		* `app.dir.project` is used as `app.dir.staticFiles`'s and `app.dir.views`'s base directory when `config.staticFilesDir` / `config.viewsDir` are not provided.
		*
		* `app.dir.project` is also used as the base directory for all `app.fileSystem` methods.
		*
		* `app.dir.project` does not end with a slash (`\` in Windows or `/` in Linux/Mac), even if the value provided in `config.projectDir` does.
		*/
	project: string;
	/**
		* The app's static files directory.
		*
		* If a value is not provided in `config.staticFilesDir`, `app.dir.project + "/public"` is used.
		*
		* If `config.disableStaticFiles` is `true`, `app.dir.staticFiles` will be `null` and static file handling will not be automatically configured, regardless of the value provided in `config.staticFilesDir`.
		*
		* `app.dir.staticFiles` does not end with a slash (`\` in Windows or `/` in Linux/Mac), even if the value provided in `config.staticFilesDir` does.
		*/
	staticFiles: string;
	/**
		* The app's views directory.
		*
		* If a value is not provided in `config.viewsDir`, `app.dir.project + "/views"` is used.
		*
		* If `config.disableViews` is `true`, `app.dir.views` will be `null` and the EJS engine will not be automatically configured, regardless of the value provided in `config.viewsDir`.
		*
		* `app.dir.views` does not end with a slash (`\` in Windows or `/` in Linux/Mac), even if the value provided in `config.viewsDir` does.
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
		* If `config.disableRoutes` is `true`, `app.dir.routes` will be `[]` and the routing will not be automatically configured.
		*
		* The values in `app.dir.routes` do not end with a slash (`\` in Windows or `/` in Linux/Mac), even if the values provided in `config.routesDir` do.
		*/
	routes: string[];
}
interface App {
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
	route: RouteDecorators;
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
	http: HttpDecorators;
	/**
		* The root path where this app is located in the actual server, in case the server hosts several apps in a single domain.
		*
		* For example, if the app is the only one hosted by the server, and is located at the root path, such as `example.com`, `app.root` is an empty string `""`.
		*
		* If the app is hosted by the server alongside other apps, such as `example.com/app1`, `app.root` is `"/app1"`.
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
		* The static root path is the virtual directory where this app's static files are located. This path is concatenated with `app.root` to produce the actual prefix used to locate the files.
		*
		* For example, if `config.staticRoot` is `"/public"` and `config.root` is `"/app1"`, `app.staticRoot` will be `"/app1/public"` and it will be assumed that all public static files are located under the virtual path `/app1/public`.
		*
		* Assuming there is an image physically located at `/project dir/public/images/avatar.jpg` and that the project is hosted at `example.com`, if `app.staticRoot` is `"/myPublicFiles"`, the image `avatar.jpg` will be accessible from the URL `http://example.com/myPublicFiles/images/avatar.jpg`.
		* On the other hand, if `app.staticRoot` is an empty string `""`, the image `avatar.jpg` will be accessible from the URL `http://example.com/images/avatar.jpg`.
		*
		* `app.staticRoot` is NOT automatically set and its value comes from `config.root` and `config.staticRoot`. If a value is not provided in `config.staticRoot`, `"/public"` is used.
		*
		* If the value in `app.staticRoot` is anything other than the empty string `""`, it is adjusted so that it always starts with a `/` character, and never ends with with a `/` character.
		*
		* `app.staticRoot` can be used in EJS files, since `app.staticRoot` is replicated to `app.express.locals.staticRoot`, allowing for constructs like `<img src="<%- staticRoot %>/path/to/image.jpg" />`.
		*/
	staticRoot: string;
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
	dir: Directories;
	/**
		* The actual Express.js app.
		*/
	express: express.Express;
	/**
		* Provides basic `Promise` wrappers around common file system operations, with relatives paths using `app.dir.project` as the base directory.
		*
		* Refer to https://nodejs.org/api/fs.html for more information.
		*/
	fileSystem: FileSystem;
	/**
		* Provides basic methods to send and receive data from remote servers.
		*/
	request: RequestMethods;
	/**
		* Provides a way to connect to the database, as specified by `config.sqlConfig`, by calling `app.sql.connect()`.
		*
		* If `config.sqlConfig` is not provided, `app.sql` will be `null`.
		*/
	sql: Sql;
	/**
		* Convenience for accessing multer package.
		*
		* If `config.disableFormData` is `true`, `app.multer` will be `null`.
		*
		* Refer to https://www.npmjs.com/package/multer for more information on the package options and use cases.
		*/
	multer: any;
	/**
		* Returns the directory of the current file.
		*
		* It is equivalent to `__dirname` but works for both CommonJS and ECMAScript modules.
		*
		* `app.currentDirectoryName()` does not end with a slash (`\` in Windows or `/` in Linux/Mac).
		*/
	currentDirectoryName(): string;
	/**
		* Returns the directory + the file name of the current file.
		*
		* It is equivalent to `__filename` but works for both CommonJS and ECMAScript modules.
		*/
	currentFileName(): string;
	/**
		* Creates, configures and starts listening the Express.js app.
		*
		* For more advanced scenarios, such as using WebSockets, it is advisable to provide a function to `config.onFinish`, which makes `app.run()` not to call `app.express.listen()` at the end of the setup process.
		*
		* Do not forget to manually call `app.express.listen()`, or another equivalent method, inside `config.onFinish`.
		*
		* For example, the code below could be used to integrate the app with Socket.IO:
		*
		* ```ts
		* import app = require("teem");
		* import http = require("http");
		* import socketio = require("socket.io");
		*
		* app.run({
		*     ... // Other options
		*
		*     onFinish: function () {
		*         const server = new http.Server(app.express);
		*         const io = new socketio.Server(server);
		*
		*         io.on("connection", function (socket: any) {
		*             console.log("New user connected");
		*         });
		*
		*         server.listen(app.port, app.localIp, function () {
		*             console.log(`Server listening on ${app.localIp}:${app.port}`);
		*         });
		*     }
		* });
		* ```
		*
		* Refer to https://socket.io for more information on the Socket.IO framework.
		*
		* @param config Optional settings used to configure the routes, paths and so on.
		*/
	run(config?: app.Config): Promise<void>;
}
declare const app: App;
export = app;

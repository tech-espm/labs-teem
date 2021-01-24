import fs = require("fs");
import path = require("path");

export interface UploadedFile {
	/**
	 * Buffer containing the file's bytes.
	 * 
	 * If `errorcode` is set, `buffer` will be `null`.
	 */
	buffer: Buffer;

	/**
	 * Encoding used to convert the file into bytes.
	 * 
	 * If `errorcode` is set, `encoding` will be `null`.
	 */
	encoding: string;

	/**
	 * The same value present in the `name` attribute of the HTML `<input>` element.
	 * 
	 * If `errorcode` is set, `fieldname` will either be `null`, if it was not possible to identify the source of the error, or will be a string containing the `name` attribute of the failing `<input>` field.
	 */
	fieldname: string;

	/**
	 * Mime type of the file.
	 * 
	 * If `errorcode` is set, `mimetype` will be `null`.
	 */
	mimetype: string;

	/**
	 * Name of the file originally uploaded by the user, as stored in their computer.
	 * 
	 * If `errorcode` is set, `originalname` will be `null`.
	 */
	originalname: string;

	/**
	 * Size of the file in bytes.
	 * 
	 * If `errorcode` is set, `size` will be `0`.
	 */
	size: number;

	/**
	 * Error code set when an error occurs during the parsing of the uploaded files.
	 * 
	 * `errorcode` is only set when an error occurs.
	 */
	errorcode?: string;

	/**
	 * Message further describing `errorcode`.
	 * 
	 * `errormessage` is only set when an error occurs.
	 */
	errormessage?: string;
}

export class FileSystem {
	public static rootDir: string;
	private static readonly wrongSlash = ((path.sep === "/") ? /\\/g : /\//g);
	private static readonly sepCode = path.sep.charCodeAt(0);
	private static readonly invalidStart = ((path.sep === "/") ? "../" : "..\\");
	private static readonly invalidMiddle = ((path.sep === "/") ? "/../" : "\\..\\");

	private static fixProjectRelativePath(projectRelativePath: string): string {
		if (projectRelativePath === "")
			return projectRelativePath;

		if (!projectRelativePath)
			throw new Error("Invalid project relative path: " + projectRelativePath);

		projectRelativePath = projectRelativePath.replace(FileSystem.wrongSlash, path.sep);

		if (projectRelativePath.charCodeAt(0) === FileSystem.sepCode)
			projectRelativePath = projectRelativePath.substr(1);

		if (projectRelativePath.startsWith(FileSystem.invalidStart) ||
			projectRelativePath.indexOf(FileSystem.invalidMiddle) >= 0)
			throw new Error("Invalid project relative path: " + projectRelativePath);

		return projectRelativePath;
	}

	public static absolutePath(projectRelativePath: string): string {
		return path.join(FileSystem.rootDir, FileSystem.fixProjectRelativePath(projectRelativePath));
	}

	public static validateUploadedFilename(filename: string): string {
		// The rules here are basicaly a mix between safety, cross-OS compatibility, actual rules...
		// https://stackoverflow.com/q/1976007/3569421
		if (!filename || !(filename = filename.trim()))
			return null;

		let valid = false;
		for (let i = filename.length - 1; i >= 0; i--) {
			const c = filename.charCodeAt(i);
			if (c < 32)
				return null;
			switch (c) {
				case 0x22: // "
				case 0x2A: // *
				case 0x2F: // /
				case 0x3A: // :
				case 0x3C: // <
				case 0x3E: // >
				case 0x3F: // ?
				case 0x5C: // \
				case 0x7C: // |
				case 0x7F:
					return null;
				case 0x20: // space
				case 0x2E: // .
					break;
				default:
					valid = true;
					break;
			}
		}
		return (valid ? filename : null);
	}

	public static createDirectory(projectRelativePath: string, options?: fs.Mode | fs.MakeDirectoryOptions): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				fs.mkdir(FileSystem.absolutePath(projectRelativePath), options, (err) => {
					if (err)
						reject(err);
					else
						resolve();
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static deleteDirectory(projectRelativePath: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				fs.rmdir(FileSystem.absolutePath(projectRelativePath), { recursive: false }, (err) => {
					if (err)
						reject(err);
					else
						resolve();
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static deleteFilesAndDirectory(projectRelativePath: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				fs.rmdir(FileSystem.absolutePath(projectRelativePath), { recursive: true }, (err) => {
					if (err)
						reject(err);
					else
						resolve();
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static renameFile(currentProjectRelativePath: string, newProjectRelativePath: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				fs.rename(FileSystem.absolutePath(currentProjectRelativePath), FileSystem.absolutePath(newProjectRelativePath), (err) => {
					if (err)
						reject(err);
					else
						resolve();
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static deleteFile(projectRelativePath: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				fs.unlink(FileSystem.absolutePath(projectRelativePath), (err) => {
					if (err)
						reject(err);
					else
						resolve();
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static fileExists(projectRelativePath: string): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			try {
				fs.access(FileSystem.absolutePath(projectRelativePath), fs.constants.F_OK, (err) => {
					resolve(!err);
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static createNewEmptyFile(projectRelativePath: string, mode?: fs.Mode): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				const options: fs.WriteFileOptions = {
					encoding: "ascii",
					flag: "wx"
				};

				if (mode !== undefined)
					options.mode = mode;

				fs.writeFile(FileSystem.absolutePath(projectRelativePath), "", options, (err) => {
					if (err)
						reject(err);
					else
						resolve();
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	private static save(projectRelativePath: string, data: string | Buffer, flag: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				const options: fs.WriteFileOptions = {
					flag: flag
				};

				if (mode !== undefined)
					options.mode = mode;

				if (encoding !== undefined)
					options.encoding = encoding;

				fs.writeFile(FileSystem.absolutePath(projectRelativePath), data, options, (err) => {
					if (err)
						reject(err);
					else
						resolve();
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static saveBuffer(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void> {
		return FileSystem.save(projectRelativePath, buffer, "w", mode);
	}

	public static saveText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void> {
		return FileSystem.save(projectRelativePath, text, "w", mode, encoding || "utf8");
	}

	public static saveUploadedFile(projectRelativePath: string, uploadedFile: UploadedFile, mode?: fs.Mode): Promise<void> {
		return FileSystem.save(projectRelativePath, uploadedFile.buffer, "w", mode);
	}

	public static saveBufferToNewFile(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void> {
		return FileSystem.save(projectRelativePath, buffer, "wx", mode);
	}

	public static saveTextToNewFile(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void> {
		return FileSystem.save(projectRelativePath, text, "wx", mode, encoding || "utf8");
	}

	public static saveUploadedFileToNewFile(projectRelativePath: string, uploadedFile: UploadedFile, mode?: fs.Mode): Promise<void> {
		return FileSystem.save(projectRelativePath, uploadedFile.buffer, "wx", mode);
	}

	private static append(projectRelativePath: string, data: string | Buffer, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				const options: fs.WriteFileOptions = {
					flag: "a"
				};

				if (mode !== undefined)
					options.mode = mode;

				if (encoding !== undefined)
					options.encoding = encoding;

				fs.appendFile(FileSystem.absolutePath(projectRelativePath), data, options, (err) => {
					if (err)
						reject(err);
					else
						resolve();
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static appendBuffer(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void> {
		return FileSystem.append(projectRelativePath, buffer, mode);
	}

	public static appendText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void> {
		return FileSystem.append(projectRelativePath, text, mode, encoding || "utf8");
	}

	private static appendToExistingFile(projectRelativePath: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				// Unfortunately, using fs.appendFile() with "r+" has the same effect as fs.writeFile()...
				fs.open(FileSystem.fixProjectRelativePath(projectRelativePath), "r+", (err, fd) => {
					if (err) {
						reject(err);
						return;
					}

					function cleanup(err: any): void {
						if (fd) {
							try {
								fs.close(fd, (closeErr) => {
									if (err)
										reject(err);
									else if (closeErr)
										reject(closeErr);
									else
										resolve();
								});
							} catch (e) {
								reject(e);
							}
						} else {
							reject(err || new Error("Unknown error"));
						}
					}

					fs.fstat(fd, (err, stats) => {
						if (err) {
							cleanup(err);
							return;
						}

						if (encoding)
							fs.write(fd, data as string, stats.size, encoding, cleanup);
						else
							fs.write(fd, data as Buffer, 0, data.length, stats.size, cleanup);
					});
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static appendBufferToExistingFile(projectRelativePath: string, buffer: Buffer): Promise<void> {
		return FileSystem.appendToExistingFile(projectRelativePath, buffer);
	}

	public static appendTextToExistingFile(projectRelativePath: string, text: string, encoding?: BufferEncoding): Promise<void> {
		return FileSystem.appendToExistingFile(projectRelativePath, text, encoding || "utf8");
	}
}

import fs = require("fs");
import path = require("path");

const wrongSlash = ((path.sep === "/") ? /\\/g : /\//g);
const sepCode = path.sep.charCodeAt(0);
const invalidStart = ((path.sep === "/") ? "../" : "..\\");
const invalidMiddle = ((path.sep === "/") ? "/../" : "\\..\\");

function fixProjectRelativePath(projectRelativePath: string): string {
	if (projectRelativePath === "")
		return projectRelativePath;

	if (!projectRelativePath)
		throw new Error("Invalid project relative path: " + projectRelativePath);

	projectRelativePath = projectRelativePath.replace(wrongSlash, path.sep);

	if (projectRelativePath.charCodeAt(0) === sepCode)
		projectRelativePath = projectRelativePath.substr(1);

	if (projectRelativePath.startsWith(invalidStart) ||
		projectRelativePath.indexOf(invalidMiddle) >= 0)
		throw new Error("Invalid project relative path: " + projectRelativePath);

	return projectRelativePath;
}

function save(projectRelativePath: string, data: string | Buffer | null, flag: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void> {
	if (!data)
		throw new Error("Null data");

	return new Promise<void>(function (resolve, reject) {
		try {
			const options: fs.WriteFileOptions = {
				flag: flag
			};

			if (mode !== undefined)
				options.mode = mode;

			if (encoding !== undefined)
				options.encoding = encoding;

			fs.writeFile(FileSystem.absolutePath(projectRelativePath), data, options, function (err) {
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

function append(projectRelativePath: string, data: string | Buffer, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void> {
	return new Promise<void>(function (resolve, reject) {
		try {
			const options: fs.WriteFileOptions = {
				flag: "a"
			};

			if (mode !== undefined)
				options.mode = mode;

			if (encoding !== undefined)
				options.encoding = encoding;

			fs.appendFile(FileSystem.absolutePath(projectRelativePath), data, options, function (err) {
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

function appendToExistingFile(projectRelativePath: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void> {
	return new Promise<void>(function (resolve, reject) {
		try {
			// Unfortunately, using fs.appendFile() with "r+" has the same effect as fs.writeFile()...
			fs.open(fixProjectRelativePath(projectRelativePath), "r+", function (err, fd) {
				if (err) {
					reject(err);
					return;
				}

				function cleanUp(err: any): void {
					if (fd) {
						try {
							fs.close(fd, function (closeErr) {
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

				fs.fstat(fd, function (err, stats) {
					if (err) {
						cleanUp(err);
						return;
					}

					if (encoding)
						fs.write(fd, data as string, stats.size, encoding, cleanUp);
					else
						fs.write(fd, data as Buffer, 0, data.length, stats.size, cleanUp);
				});
			});
		} catch (e) {
			reject(e);
		}
	});
}

function read(projectRelativePath: string, flag: string, buffer: boolean, encoding?: BufferEncoding): Promise<string | Buffer> {
	return new Promise<string | Buffer>(function (resolve, reject) {
		try {
			const options: fs.WriteFileOptions = {
				flag: flag
			};

			if (encoding !== undefined && !buffer)
				options.encoding = encoding;

			fs.readFile(FileSystem.absolutePath(projectRelativePath), options, function (err, data) {
				if (err)
					reject(err);
				else
					resolve(data);
			});
		} catch (e) {
			reject(e);
		}
	});
}

export interface UploadedFile {
	/**
	 * Buffer containing the file's bytes.
	 * 
	 * If `errorcode` is set, `buffer` will be `null`.
	 */
	buffer: Buffer | null;

	/**
	 * Encoding used to convert the file into bytes.
	 * 
	 * If `errorcode` is set, `encoding` will be `null`.
	 */
	encoding: string | null;

	/**
	 * The same value present in the `name` attribute of the HTML `<input>` element.
	 * 
	 * If `errorcode` is set, `fieldname` will either be `null`, if it was not possible to identify the source of the error, or will be a string containing the `name` attribute of the failing `<input>` field.
	 */
	fieldname: string | null;

	/**
	 * Mime type of the file.
	 * 
	 * If `errorcode` is set, `mimetype` will be `null`.
	 */
	mimetype: string | null;

	/**
	 * Name of the file originally uploaded by the user, as stored in their computer.
	 * 
	 * If `errorcode` is set, `originalname` will be `null`.
	 */
	originalname: string | null;

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

	public static absolutePath(projectRelativePath: string): string {
		return path.join(FileSystem.rootDir, fixProjectRelativePath(projectRelativePath));
	}

	public static validateUploadedFilename(filename: string): string | null {
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
		return new Promise<void>(function (resolve, reject) {
			try {
				fs.mkdir(FileSystem.absolutePath(projectRelativePath), options, function (err) {
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
		return new Promise<void>(function (resolve, reject) {
			try {
				fs.rmdir(FileSystem.absolutePath(projectRelativePath), { recursive: false }, function (err) {
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
		return new Promise<void>(function (resolve, reject) {
			try {
				fs.rmdir(FileSystem.absolutePath(projectRelativePath), { recursive: true }, function (err) {
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

	public static rename(currentProjectRelativePath: string, newProjectRelativePath: string): Promise<void> {
		return new Promise<void>(function (resolve, reject) {
			try {
				fs.rename(FileSystem.absolutePath(currentProjectRelativePath), FileSystem.absolutePath(newProjectRelativePath), function (err) {
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
		return new Promise<void>(function (resolve, reject) {
			try {
				fs.unlink(FileSystem.absolutePath(projectRelativePath), function (err) {
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

	public static exists(projectRelativePath: string): Promise<boolean> {
		return new Promise<boolean>(function (resolve, reject) {
			try {
				fs.access(FileSystem.absolutePath(projectRelativePath), fs.constants.F_OK, function (err) {
					resolve(!err);
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static createNewEmptyFile(projectRelativePath: string, mode?: fs.Mode): Promise<void> {
		return new Promise<void>(function (resolve, reject) {
			try {
				const options: fs.WriteFileOptions = {
					encoding: "ascii",
					flag: "wx"
				};

				if (mode !== undefined)
					options.mode = mode;

				fs.writeFile(FileSystem.absolutePath(projectRelativePath), "", options, function (err) {
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
		return save(projectRelativePath, buffer, "w", mode);
	}

	public static saveText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void> {
		return save(projectRelativePath, text, "w", mode, encoding || "utf8");
	}

	public static saveUploadedFile(projectRelativePath: string, uploadedFile: UploadedFile, mode?: fs.Mode): Promise<void> {
		return save(projectRelativePath, uploadedFile.buffer, "w", mode);
	}

	public static saveBufferToNewFile(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void> {
		return save(projectRelativePath, buffer, "wx", mode);
	}

	public static saveTextToNewFile(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void> {
		return save(projectRelativePath, text, "wx", mode, encoding || "utf8");
	}

	public static saveUploadedFileToNewFile(projectRelativePath: string, uploadedFile: UploadedFile, mode?: fs.Mode): Promise<void> {
		return save(projectRelativePath, uploadedFile.buffer, "wx", mode);
	}

	public static appendBuffer(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void> {
		return append(projectRelativePath, buffer, mode);
	}

	public static appendText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void> {
		return append(projectRelativePath, text, mode, encoding || "utf8");
	}

	public static appendBufferToExistingFile(projectRelativePath: string, buffer: Buffer): Promise<void> {
		return appendToExistingFile(projectRelativePath, buffer);
	}

	public static appendTextToExistingFile(projectRelativePath: string, text: string, encoding?: BufferEncoding): Promise<void> {
		return appendToExistingFile(projectRelativePath, text, encoding || "utf8");
	}

	public static readBufferFromExistingFile(projectRelativePath: string): Promise<Buffer> {
		return read(projectRelativePath, "r", true) as Promise<Buffer>;
	}

	public static readTextFromExistingFile(projectRelativePath: string, encoding?: BufferEncoding): Promise<string> {
		return read(projectRelativePath, "r", false, encoding || "utf8") as Promise<string>;
	}
}

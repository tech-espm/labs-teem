"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystem = void 0;
const fs = require("fs");
const path = require("path");
const wrongSlash = ((path.sep === "/") ? /\\/g : /\//g);
const sepCode = path.sep.charCodeAt(0);
const invalidStart = ((path.sep === "/") ? "../" : "..\\");
const invalidMiddle = ((path.sep === "/") ? "/../" : "\\..\\");
function fixProjectRelativePath(projectRelativePath) {
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
function save(projectRelativePath, data, flag, mode, encoding) {
	if (!data)
		throw new Error("Null data");
	return new Promise(function (resolve, reject) {
		try {
			const options = {
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
		}
		catch (e) {
			reject(e);
		}
	});
}
function append(projectRelativePath, data, mode, encoding) {
	return new Promise(function (resolve, reject) {
		try {
			const options = {
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
		}
		catch (e) {
			reject(e);
		}
	});
}
function appendToExistingFile(projectRelativePath, data, encoding) {
	return new Promise(function (resolve, reject) {
		try {
			// Unfortunately, using fs.appendFile() with "r+" has the same effect as fs.writeFile()...
			fs.open(fixProjectRelativePath(projectRelativePath), "r+", function (err, fd) {
				if (err) {
					reject(err);
					return;
				}
				function cleanUp(err) {
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
						}
						catch (e) {
							reject(e);
						}
					}
					else {
						reject(err || new Error("Unknown error"));
					}
				}
				fs.fstat(fd, function (err, stats) {
					if (err) {
						cleanUp(err);
						return;
					}
					if (encoding)
						fs.write(fd, data, stats.size, encoding, cleanUp);
					else
						fs.write(fd, data, 0, data.length, stats.size, cleanUp);
				});
			});
		}
		catch (e) {
			reject(e);
		}
	});
}
function read(projectRelativePath, flag, buffer, encoding) {
	return new Promise(function (resolve, reject) {
		try {
			const options = {
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
		}
		catch (e) {
			reject(e);
		}
	});
}
class FileSystem {
	static absolutePath(projectRelativePath) {
		return path.join(FileSystem.rootDir, fixProjectRelativePath(projectRelativePath));
	}
	static validateUploadedFilename(filename) {
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
	static createDirectory(projectRelativePath, options) {
		return new Promise(function (resolve, reject) {
			try {
				fs.mkdir(FileSystem.absolutePath(projectRelativePath), options, function (err) {
					if (err)
						reject(err);
					else
						resolve();
				});
			}
			catch (e) {
				reject(e);
			}
		});
	}
	static deleteDirectory(projectRelativePath) {
		return new Promise(function (resolve, reject) {
			try {
				fs.rmdir(FileSystem.absolutePath(projectRelativePath), { recursive: false }, function (err) {
					if (err)
						reject(err);
					else
						resolve();
				});
			}
			catch (e) {
				reject(e);
			}
		});
	}
	static deleteFilesAndDirectory(projectRelativePath) {
		return new Promise(function (resolve, reject) {
			try {
				fs.rmdir(FileSystem.absolutePath(projectRelativePath), { recursive: true }, function (err) {
					if (err)
						reject(err);
					else
						resolve();
				});
			}
			catch (e) {
				reject(e);
			}
		});
	}
	static rename(currentProjectRelativePath, newProjectRelativePath) {
		return new Promise(function (resolve, reject) {
			try {
				fs.rename(FileSystem.absolutePath(currentProjectRelativePath), FileSystem.absolutePath(newProjectRelativePath), function (err) {
					if (err)
						reject(err);
					else
						resolve();
				});
			}
			catch (e) {
				reject(e);
			}
		});
	}
	static deleteFile(projectRelativePath) {
		return new Promise(function (resolve, reject) {
			try {
				fs.unlink(FileSystem.absolutePath(projectRelativePath), function (err) {
					if (err)
						reject(err);
					else
						resolve();
				});
			}
			catch (e) {
				reject(e);
			}
		});
	}
	static exists(projectRelativePath) {
		return new Promise(function (resolve, reject) {
			try {
				fs.access(FileSystem.absolutePath(projectRelativePath), fs.constants.F_OK, function (err) {
					resolve(!err);
				});
			}
			catch (e) {
				reject(e);
			}
		});
	}
	static createNewEmptyFile(projectRelativePath, mode) {
		return new Promise(function (resolve, reject) {
			try {
				const options = {
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
			}
			catch (e) {
				reject(e);
			}
		});
	}
	static saveBuffer(projectRelativePath, buffer, mode) {
		return save(projectRelativePath, buffer, "w", mode);
	}
	static saveText(projectRelativePath, text, mode, encoding) {
		return save(projectRelativePath, text, "w", mode, encoding || "utf8");
	}
	static saveUploadedFile(projectRelativePath, uploadedFile, mode) {
		return save(projectRelativePath, uploadedFile.buffer, "w", mode);
	}
	static saveBufferToNewFile(projectRelativePath, buffer, mode) {
		return save(projectRelativePath, buffer, "wx", mode);
	}
	static saveTextToNewFile(projectRelativePath, text, mode, encoding) {
		return save(projectRelativePath, text, "wx", mode, encoding || "utf8");
	}
	static saveUploadedFileToNewFile(projectRelativePath, uploadedFile, mode) {
		return save(projectRelativePath, uploadedFile.buffer, "wx", mode);
	}
	static appendBuffer(projectRelativePath, buffer, mode) {
		return append(projectRelativePath, buffer, mode);
	}
	static appendText(projectRelativePath, text, mode, encoding) {
		return append(projectRelativePath, text, mode, encoding || "utf8");
	}
	static appendBufferToExistingFile(projectRelativePath, buffer) {
		return appendToExistingFile(projectRelativePath, buffer);
	}
	static appendTextToExistingFile(projectRelativePath, text, encoding) {
		return appendToExistingFile(projectRelativePath, text, encoding || "utf8");
	}
	static readBufferFromExistingFile(projectRelativePath) {
		return read(projectRelativePath, "r", true);
	}
	static readTextFromExistingFile(projectRelativePath, encoding) {
		return read(projectRelativePath, "r", false, encoding || "utf8");
	}
}
exports.FileSystem = FileSystem;

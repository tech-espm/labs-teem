"use strict";
var _a;
const fs = require("fs");
const path = require("path");
module.exports = (_a = class FileSystem {
        static fixProjectRelativePath(projectRelativePath) {
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
        static absolutePath(projectRelativePath) {
            return path.join(FileSystem.rootDir, FileSystem.fixProjectRelativePath(projectRelativePath));
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
            return new Promise((resolve, reject) => {
                try {
                    fs.mkdir(FileSystem.absolutePath(projectRelativePath), options, (err) => {
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
            return new Promise((resolve, reject) => {
                try {
                    fs.rmdir(FileSystem.absolutePath(projectRelativePath), { recursive: false }, (err) => {
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
            return new Promise((resolve, reject) => {
                try {
                    fs.rmdir(FileSystem.absolutePath(projectRelativePath), { recursive: true }, (err) => {
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
        static renameFile(currentProjectRelativePath, newProjectRelativePath) {
            return new Promise((resolve, reject) => {
                try {
                    fs.rename(FileSystem.absolutePath(currentProjectRelativePath), FileSystem.absolutePath(newProjectRelativePath), (err) => {
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
            return new Promise((resolve, reject) => {
                try {
                    fs.unlink(FileSystem.absolutePath(projectRelativePath), (err) => {
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
        static fileExists(projectRelativePath) {
            return new Promise((resolve, reject) => {
                try {
                    fs.access(FileSystem.absolutePath(projectRelativePath), fs.constants.F_OK, (err) => {
                        resolve(!err);
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        }
        static createNewEmptyFile(projectRelativePath, mode) {
            return new Promise((resolve, reject) => {
                try {
                    const options = {
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
                }
                catch (e) {
                    reject(e);
                }
            });
        }
        static save(projectRelativePath, data, flag, mode, encoding) {
            return new Promise((resolve, reject) => {
                try {
                    const options = {
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
                }
                catch (e) {
                    reject(e);
                }
            });
        }
        static saveBuffer(projectRelativePath, buffer, mode) {
            return FileSystem.save(projectRelativePath, buffer, "w", mode);
        }
        static saveText(projectRelativePath, text, mode, encoding) {
            return FileSystem.save(projectRelativePath, text, "w", mode, encoding || "utf8");
        }
        static saveBufferToNewFile(projectRelativePath, buffer, mode) {
            return FileSystem.save(projectRelativePath, buffer, "wx", mode);
        }
        static saveTextToNewFile(projectRelativePath, text, mode, encoding) {
            return FileSystem.save(projectRelativePath, text, "wx", mode, encoding || "utf8");
        }
        static append(projectRelativePath, data, mode, encoding) {
            return new Promise((resolve, reject) => {
                try {
                    const options = {
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
                }
                catch (e) {
                    reject(e);
                }
            });
        }
        static appendBuffer(projectRelativePath, buffer, mode) {
            return FileSystem.append(projectRelativePath, buffer, mode);
        }
        static appendText(projectRelativePath, text, mode, encoding) {
            return FileSystem.append(projectRelativePath, text, mode, encoding || "utf8");
        }
        static appendToExistingFile(projectRelativePath, data, encoding) {
            return new Promise((resolve, reject) => {
                try {
                    // Unfortunately, using fs.appendFile() with "r+" has the same effect as fs.writeFile()...
                    fs.open(FileSystem.fixProjectRelativePath(projectRelativePath), "r+", (err, fd) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        function cleanup(err) {
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
                                }
                                catch (e) {
                                    reject(e);
                                }
                            }
                            else {
                                reject(err || new Error("Unknown error"));
                            }
                        }
                        fs.fstat(fd, (err, stats) => {
                            if (err) {
                                cleanup(err);
                                return;
                            }
                            if (encoding)
                                fs.write(fd, data, stats.size, encoding, cleanup);
                            else
                                fs.write(fd, data, 0, data.length, stats.size, cleanup);
                        });
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        }
        static appendBufferToExistingFile(projectRelativePath, buffer) {
            return FileSystem.appendToExistingFile(projectRelativePath, buffer);
        }
        static appendTextToExistingFile(projectRelativePath, text, encoding) {
            return FileSystem.appendToExistingFile(projectRelativePath, text, encoding || "utf8");
        }
    },
    _a.wrongSlash = ((path.sep === "/") ? /\\/g : /\//g),
    _a.sepCode = path.sep.charCodeAt(0),
    _a.invalidStart = ((path.sep === "/") ? "../" : "..\\"),
    _a.invalidMiddle = ((path.sep === "/") ? "/../" : "\\..\\"),
    _a);

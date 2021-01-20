"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystem = void 0;
const fs = require("fs");
const path = require("path");
class FileSystem {
    static fixRelativePath(relativePath, slashsValid) {
        if (!relativePath ||
            relativePath.charAt(0) === "." ||
            relativePath.indexOf("..") >= 0 ||
            relativePath.indexOf("*") >= 0 ||
            relativePath.indexOf("?") >= 0 ||
            relativePath.indexOf(">") >= 0 ||
            relativePath.indexOf("<") >= 0 ||
            relativePath.indexOf("|") >= 0 ||
            (!slashsValid && (relativePath.indexOf("\\") >= 0 || relativePath.indexOf("/") >= 0)))
            throw new Error("Invalid relative path: " + relativePath);
        return relativePath.replace(FileSystem.wrongSlash, path.sep);
    }
    static absolutePath(relativePath, filename) {
        if (filename) {
            if (!(filename = FileSystem.validateFilename(filename)))
                throw new Error("Invalid filename: " + filename);
            return path.join(FileSystem.rootDir, FileSystem.fixRelativePath(relativePath, true), filename);
        }
        return path.join(FileSystem.rootDir, FileSystem.fixRelativePath(relativePath, true));
    }
    static validateFilename(filename) {
        return ((!filename ||
            !(filename = filename.trim()) ||
            filename.charAt(0) === "." ||
            filename.indexOf("..") >= 0 ||
            filename.indexOf("*") >= 0 ||
            filename.indexOf("?") >= 0 ||
            filename.indexOf(">") >= 0 ||
            filename.indexOf("<") >= 0 ||
            filename.indexOf("|") >= 0 ||
            filename.indexOf("\\") >= 0 ||
            filename.indexOf("/") >= 0) ? null : filename);
    }
    static async createDirectory(relativePath, options) {
        relativePath = FileSystem.fixRelativePath(relativePath, true);
        return new Promise((resolve, reject) => {
            try {
                fs.mkdir(path.join(FileSystem.rootDir, relativePath), options || 0o777, (err) => {
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
    static async deleteDirectory(relativePath) {
        if (!(relativePath = FileSystem.fixRelativePath(relativePath, true)))
            throw new Error("Invalid relative path: " + relativePath);
        return new Promise((resolve, reject) => {
            try {
                fs.rmdir(path.join(FileSystem.rootDir, relativePath), { recursive: false }, (err) => {
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
    static async deleteFilesAndDirectory(relativePath) {
        if (!(relativePath = FileSystem.fixRelativePath(relativePath, true)))
            throw new Error("Invalid relative path: " + relativePath);
        return new Promise((resolve, reject) => {
            try {
                fs.rmdir(path.join(FileSystem.rootDir, relativePath), { recursive: true }, (err) => {
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
    static async renameFile(currentRelativePath, newRelativePath) {
        if (!(currentRelativePath = FileSystem.fixRelativePath(currentRelativePath, true)))
            throw new Error("Invalid current relative path: " + currentRelativePath);
        if (!(newRelativePath = FileSystem.fixRelativePath(newRelativePath, true)))
            throw new Error("Invalid new relative path: " + newRelativePath);
        return new Promise((resolve, reject) => {
            try {
                fs.rename(path.join(FileSystem.rootDir, currentRelativePath), path.join(FileSystem.rootDir, newRelativePath), (err) => {
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
    static async deleteFile(relativePath) {
        if (!(relativePath = FileSystem.fixRelativePath(relativePath, true)))
            throw new Error("Invalid relative path: " + relativePath);
        return new Promise((resolve, reject) => {
            try {
                fs.unlink(path.join(FileSystem.rootDir, relativePath), (err) => {
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
    static async fileExists(relativePath) {
        if (!(relativePath = FileSystem.fixRelativePath(relativePath, true)))
            throw new Error("Invalid relative path: " + relativePath);
        return new Promise((resolve, reject) => {
            try {
                fs.access(path.join(FileSystem.rootDir, relativePath), fs.constants.F_OK, (err) => {
                    resolve(!!err);
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    static async saveBuffer(buffer, directoryRelativePath, filename, mode) {
        return new Promise((resolve, reject) => {
            try {
                const options = {
                    flag: "w"
                };
                if (mode !== undefined)
                    options.mode = mode;
                fs.writeFile(FileSystem.absolutePath(directoryRelativePath, filename), buffer.buffer || buffer, options, (err) => {
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
    static async createNewEmptyFile(directoryRelativePath, filename, mode) {
        return new Promise((resolve, reject) => {
            try {
                const options = {
                    encoding: "ascii",
                    flag: "wx"
                };
                if (mode !== undefined)
                    options.mode = mode;
                fs.writeFile(FileSystem.absolutePath(directoryRelativePath, filename), "", options, (err) => {
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
    static async appendBufferToExistingFile(buffer, directoryRelativePath, filename) {
        return new Promise((resolve, reject) => {
            try {
                const options = {
                    flag: "r+"
                };
                fs.appendFile(FileSystem.absolutePath(directoryRelativePath, filename), buffer.buffer || buffer, options, (err) => {
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
}
exports.FileSystem = FileSystem;
FileSystem.wrongSlash = ((path.sep === "/") ? /\\/g : /\//g);

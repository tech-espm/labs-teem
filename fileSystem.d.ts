/// <reference types="node" />
import fs = require("fs");
export interface BufferContainer {
    buffer: Buffer;
}
export declare class FileSystem {
    static rootDir: string;
    private static readonly wrongSlash;
    private static fixRelativePath;
    static absolutePath(relativePath: string, filename?: string): string;
    static validateFilename(filename: string): string;
    static createDirectory(relativePath: string, options: fs.Mode | fs.MakeDirectoryOptions): Promise<void>;
    static deleteDirectory(relativePath: string): Promise<void>;
    static deleteFilesAndDirectory(relativePath: string): Promise<void>;
    static renameFile(currentRelativePath: string, newRelativePath: string): Promise<void>;
    static deleteFile(relativePath: string): Promise<void>;
    static fileExists(relativePath: string): Promise<boolean>;
    static saveBuffer(buffer: Buffer | BufferContainer, directoryRelativePath: string, filename: string, mode?: fs.Mode): Promise<void>;
    static createNewEmptyFile(directoryRelativePath: string, filename: string, mode?: fs.Mode): Promise<void>;
    static appendBufferToExistingFile(buffer: Buffer | BufferContainer, directoryRelativePath: string, filename: string): Promise<void>;
}

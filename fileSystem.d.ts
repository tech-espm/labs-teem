/// <reference types="node" />
import fs = require("fs");
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
export declare class FileSystem {
	static rootDir: string;
	static absolutePath(projectRelativePath: string): string;
	static validateUploadedFilename(filename: string): string | null;
	static createDirectory(projectRelativePath: string, options?: fs.Mode | fs.MakeDirectoryOptions): Promise<void>;
	static deleteDirectory(projectRelativePath: string): Promise<void>;
	static deleteFilesAndDirectory(projectRelativePath: string): Promise<void>;
	static rename(currentProjectRelativePath: string, newProjectRelativePath: string): Promise<void>;
	static deleteFile(projectRelativePath: string): Promise<void>;
	static exists(projectRelativePath: string): Promise<boolean>;
	static createNewEmptyFile(projectRelativePath: string, mode?: fs.Mode): Promise<void>;
	static saveBuffer(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
	static saveText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
	static saveUploadedFile(projectRelativePath: string, uploadedFile: UploadedFile, mode?: fs.Mode): Promise<void>;
	static saveBufferToNewFile(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
	static saveTextToNewFile(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
	static saveUploadedFileToNewFile(projectRelativePath: string, uploadedFile: UploadedFile, mode?: fs.Mode): Promise<void>;
	static appendBuffer(projectRelativePath: string, buffer: Buffer, mode?: fs.Mode): Promise<void>;
	static appendText(projectRelativePath: string, text: string, mode?: fs.Mode, encoding?: BufferEncoding): Promise<void>;
	static appendBufferToExistingFile(projectRelativePath: string, buffer: Buffer): Promise<void>;
	static appendTextToExistingFile(projectRelativePath: string, text: string, encoding?: BufferEncoding): Promise<void>;
	static readBufferFromExistingFile(projectRelativePath: string): Promise<Buffer>;
	static readTextFromExistingFile(projectRelativePath: string, encoding?: BufferEncoding): Promise<string>;
}

import fs = require("fs");
import path = require("path");

export interface BufferContainer {
	buffer: Buffer;
}

export class FileSystem {
	public static rootDir: string;
	private static readonly wrongSlash = ((path.sep === "/") ? /\\/g : /\//g);

	private static fixRelativePath(relativePath: string, slashsValid: boolean): string {
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

	public static absolutePath(relativePath: string, filename?: string): string {
		if (filename) {
			if (!(filename = FileSystem.validateFilename(filename)))
				throw new Error("Invalid filename: " + filename);

			return path.join(FileSystem.rootDir, FileSystem.fixRelativePath(relativePath, true), filename);
		}
		return path.join(FileSystem.rootDir, FileSystem.fixRelativePath(relativePath, true));
	}

	public static validateFilename(filename: string): string {
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

	public static async createDirectory(relativePath: string, options: fs.Mode | fs.MakeDirectoryOptions): Promise<void> {
		relativePath = FileSystem.fixRelativePath(relativePath, true);

		return new Promise<void>((resolve, reject) => {
			try {
				fs.mkdir(path.join(FileSystem.rootDir, relativePath), options || 0o777, (err) => {
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

	public static async deleteDirectory(relativePath: string): Promise<void> {
		if (!(relativePath = FileSystem.fixRelativePath(relativePath, true)))
			throw new Error("Invalid relative path: " + relativePath);

		return new Promise<void>((resolve, reject) => {
			try {
				fs.rmdir(path.join(FileSystem.rootDir, relativePath), { recursive: false }, (err) => {
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

	public static async deleteFilesAndDirectory(relativePath: string): Promise<void> {
		if (!(relativePath = FileSystem.fixRelativePath(relativePath, true)))
			throw new Error("Invalid relative path: " + relativePath);

		return new Promise<void>((resolve, reject) => {
			try {
				fs.rmdir(path.join(FileSystem.rootDir, relativePath), { recursive: true }, (err) => {
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

	public static async renameFile(currentRelativePath: string, newRelativePath: string): Promise<void> {
		if (!(currentRelativePath = FileSystem.fixRelativePath(currentRelativePath, true)))
			throw new Error("Invalid current relative path: " + currentRelativePath);

		if (!(newRelativePath = FileSystem.fixRelativePath(newRelativePath, true)))
			throw new Error("Invalid new relative path: " + newRelativePath);

		return new Promise<void>((resolve, reject) => {
			try {
				fs.rename(path.join(FileSystem.rootDir, currentRelativePath), path.join(FileSystem.rootDir, newRelativePath), (err) => {
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

	public static async deleteFile(relativePath: string): Promise<void> {
		if (!(relativePath = FileSystem.fixRelativePath(relativePath, true)))
			throw new Error("Invalid relative path: " + relativePath);

		return new Promise<void>((resolve, reject) => {
			try {
				fs.unlink(path.join(FileSystem.rootDir, relativePath), (err) => {
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

	public static async fileExists(relativePath: string): Promise<boolean> {
		if (!(relativePath = FileSystem.fixRelativePath(relativePath, true)))
			throw new Error("Invalid relative path: " + relativePath);

		return new Promise<boolean>((resolve, reject) => {
			try {
				fs.access(path.join(FileSystem.rootDir, relativePath), fs.constants.F_OK, (err) => {
					resolve(!!err);
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	public static async saveBuffer(buffer: Buffer | BufferContainer, directoryRelativePath: string, filename: string, mode?: fs.Mode): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				const options: fs.WriteFileOptions = {
					flag: "w"
				};

				if (mode !== undefined)
					options.mode = mode;

				fs.writeFile(FileSystem.absolutePath(directoryRelativePath, filename), (buffer as BufferContainer).buffer || (buffer as Buffer), options, (err) => {
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

	public static async createNewEmptyFile(directoryRelativePath: string, filename: string, mode?: fs.Mode): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				const options: fs.WriteFileOptions = {
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
			} catch (e) {
				reject(e);
			}
		});
	}

	public static async appendBufferToExistingFile(buffer: Buffer | BufferContainer, directoryRelativePath: string, filename: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				const options: fs.WriteFileOptions = {
					flag: "r+"
				};

				fs.appendFile(FileSystem.absolutePath(directoryRelativePath, filename), (buffer as BufferContainer).buffer || (buffer as Buffer), options, (err) => {
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
}

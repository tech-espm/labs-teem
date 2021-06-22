"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sql = exports.init = void 0;
const mysql = require("mysql2");
let pool;
function init(poolConfig) {
	if (!poolConfig)
		throw new Error("Missing poolConfig");
	if (!pool)
		pool = mysql.createPool(poolConfig);
}
exports.init = init;
class Sql {
	constructor() {
		// https://www.npmjs.com/package/mysql2
		this.connection = null;
		this.pendingTransaction = false;
		this.affectedRows = 0;
		this.resultFields = null;
	}
	static async connect(callback) {
		return new Promise(function (resolve, reject) {
			pool.getConnection(function (error, connection) {
				if (error) {
					reject(error);
					return;
				}
				const sql = new Sql();
				sql.connection = connection;
				function cleanUp() {
					if (sql) {
						sql.connection = null;
						sql.resultFields = null;
					}
					connection.release();
				}
				try {
					callback(sql)
						.then(function (value) {
						if (sql.pendingTransaction) {
							sql.pendingTransaction = false;
							connection.rollback(function () {
								cleanUp();
								resolve(value);
							});
						}
						else {
							cleanUp();
							resolve(value);
						}
					}, function (reason) {
						if (sql.pendingTransaction) {
							sql.pendingTransaction = false;
							connection.rollback(function () {
								cleanUp();
								reject(reason);
							});
						}
						else {
							cleanUp();
							reject(reason);
						}
					});
				}
				catch (e) {
					if (sql.pendingTransaction) {
						sql.pendingTransaction = false;
						connection.rollback(function () {
							cleanUp();
							reject(e);
						});
					}
					else {
						cleanUp();
						reject(e);
					}
				}
			});
		});
	}
	async query(queryStr, values) {
		return new Promise((resolve, reject) => {
			const callback = (error, results, fields) => {
				if (error) {
					reject(error);
					return;
				}
				this.affectedRows = parseInt(results.affectedRows) | 0;
				this.resultFields = (fields || null);
				resolve(results);
			};
			if (!this.connection)
				throw new Error("Null connection");
			if (values && values.length)
				this.connection.query(queryStr, values, callback);
			else
				this.connection.query(queryStr, callback);
		});
	}
	async scalar(queryStr, values) {
		return new Promise((resolve, reject) => {
			const callback = (error, results, fields) => {
				if (error) {
					reject(error);
					return;
				}
				this.affectedRows = parseInt(results.affectedRows) | 0;
				this.resultFields = (fields || null);
				if (results) {
					const r = results[0];
					if (r) {
						for (let i in r) {
							resolve(r[i]);
							return;
						}
					}
				}
				resolve(null);
			};
			if (!this.connection)
				throw new Error("Null connection");
			if (values && values.length)
				this.connection.query(queryStr, values, callback);
			else
				this.connection.query(queryStr, callback);
		});
	}
	async beginTransaction() {
		if (this.pendingTransaction)
			throw new Error("There is already an open transaction in this connection");
		return new Promise((resolve, reject) => {
			if (!this.connection)
				throw new Error("Null connection");
			this.connection.beginTransaction((error) => {
				if (error) {
					reject(error);
					return;
				}
				this.pendingTransaction = true;
				resolve();
			});
		});
	}
	async commit() {
		if (!this.pendingTransaction)
			return;
		return new Promise((resolve, reject) => {
			if (!this.connection)
				throw new Error("Null connection");
			this.connection.commit((error) => {
				if (error) {
					reject(error);
					return;
				}
				this.pendingTransaction = false;
				resolve();
			});
		});
	}
	async rollback() {
		if (!this.pendingTransaction)
			return;
		return new Promise((resolve, reject) => {
			if (!this.connection)
				throw new Error("Null connection");
			this.connection.rollback(() => {
				this.pendingTransaction = false;
				resolve();
			});
		});
	}
}
exports.Sql = Sql;
;

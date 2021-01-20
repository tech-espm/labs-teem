"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sql = void 0;
const mysql = require("mysql");
class Sql {
    static init(poolConfig) {
        if (!poolConfig)
            throw new Error("Missing poolConfig");
        if (!Sql.pool)
            Sql.pool = mysql.createPool(poolConfig);
    }
    static async connect(callback) {
        return new Promise((resolve, reject) => {
            Sql.pool.getConnection((error, connection) => {
                if (error) {
                    reject(error);
                    return;
                }
                let sql = new Sql();
                sql.connection = connection;
                sql.pendingTransaction = false;
                sql.affectedRows = 0;
                sql.resultFields = null;
                try {
                    callback(sql)
                        .then((value) => {
                        if (sql.pendingTransaction) {
                            sql.pendingTransaction = false;
                            connection.rollback((error) => {
                                connection.release();
                                if (error)
                                    reject(error);
                                else
                                    resolve(value);
                            });
                        }
                        else {
                            connection.release();
                            resolve(value);
                        }
                    }, reason => {
                        if (sql.pendingTransaction) {
                            sql.pendingTransaction = false;
                            connection.rollback((error) => {
                                connection.release();
                                if (error)
                                    reject(error);
                                else
                                    reject(reason);
                            });
                        }
                        else {
                            connection.release();
                            reject(reason);
                        }
                    });
                }
                catch (e) {
                    if (sql.pendingTransaction) {
                        sql.pendingTransaction = false;
                        connection.rollback((error) => {
                            connection.release();
                            if (error)
                                reject(error);
                            else
                                reject(e);
                        });
                    }
                    else {
                        connection.release();
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
            this.connection.rollback((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                this.pendingTransaction = false;
                resolve();
            });
        });
    }
}
exports.Sql = Sql;
;

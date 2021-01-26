import mysql = require("mysql");

let pool: mysql.Pool;

export function init(poolConfig: mysql.PoolConfig): void {
	if (!poolConfig)
		throw new Error("Missing poolConfig");

	if (!pool)
		pool = mysql.createPool(poolConfig);
}

export interface SqlInterface {
	/**
	 * How many rows were affected by the last execution of `query()` or `scalar()`.
	 */
	affectedRows: number;

	/**
	 * The filed information returned by the last execution of `query()` or `scalar()` (can be `null`).
	 */
	resultFields: mysql.FieldInfo[];

	/**
	 * Executes the statement given in `queryStr` and returns the resulting rows (if any).
	 * @param queryStr The statement to be executed.
	 * @param values Optional array of values to be used as the arguments of the ? placeholders used in `queryStr`.
	 */
	query<T>(queryStr: string, values?: any): Promise<T[]>;

	/**
	 * Executes the statement given in `queryStr` and returns the first column of the first resulting row (if any).
	 * @param queryStr The statement to be executed.
	 * @param values Optional array of values to be used as the arguments of the ? placeholders used in `queryStr`.
	 */
	scalar<T>(queryStr: string, values?: any): Promise<T>;

	/**
	 * Begins a database transaction.
	 * 
	 * `commit()` must be called after the last statement is executed in order to actually commit to the database all the changes made by the previous statements.
	 * 
	 * If an unhandled exception occurs, and there is an open transaction, `rollback()` is automatically called.
	 * 
	 * An exception is thrown if `beginTransaction()` is called while another open transaction already exists.
	 */
	beginTransaction(): Promise<void>;

	/**
	 * Commits the current open database transaction.
	 * 
	 * No exceptions are thrown if `commit()` is called while no open transaction exists.
	 */
	commit(): Promise<void>;

	/**
	 * Rolls back the current open database transaction.
	 * 
	 * No exceptions are thrown if `rollback()` is called while no open transaction exists.
	 */
	rollback(): Promise<void>;
}

export class Sql implements SqlInterface {
	// https://www.npmjs.com/package/mysql

	private connection: mysql.PoolConnection;
	private pendingTransaction: boolean;
	public affectedRows: number;
	public resultFields: mysql.FieldInfo[];

	public static async connect<T>(callback: (sql: Sql) => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			pool.getConnection((error, connection) => {
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
						.then((value: T) => {
							if (sql.pendingTransaction) {
								sql.pendingTransaction = false;
								connection.rollback((error) => {
									connection.release();

									if (error)
										reject(error);
									else
										resolve(value);
								});
							} else {
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
							} else {
								connection.release();
								reject(reason);
							}
						});
				} catch (e) {
					if (sql.pendingTransaction) {
						sql.pendingTransaction = false;
						connection.rollback((error) => {
							connection.release();

							if (error)
								reject(error);
							else
								reject(e);
						});
					} else {
						connection.release();
						reject(e);
					}
				}
			});
		});
	}

	public async query<T>(queryStr: string, values?: any): Promise<T[]> {
		return new Promise<T[]>((resolve, reject) => {
			const callback = (error: mysql.MysqlError, results?: any, fields?: mysql.FieldInfo[]) => {
				if (error) {
					reject(error);
					return;
				}

				this.affectedRows = parseInt(results.affectedRows) | 0;
				this.resultFields = (fields || null);

				resolve(results as T[]);
			};

			if (values && values.length)
				this.connection.query(queryStr, values, callback);
			else
				this.connection.query(queryStr, callback);
		});
	}

	public async scalar<T>(queryStr: string, values?: any): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const callback = (error: mysql.MysqlError, results?: any, fields?: mysql.FieldInfo[]) => {
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

	public async beginTransaction(): Promise<void> {
		if (this.pendingTransaction)
			throw new Error("There is already an open transaction in this connection");

		return new Promise<void>((resolve, reject) => {
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

	public async commit(): Promise<void> {
		if (!this.pendingTransaction)
			return;

		return new Promise<void>((resolve, reject) => {
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

	public async rollback(): Promise<void> {
		if (!this.pendingTransaction)
			return;

		return new Promise<void>((resolve, reject) => {
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
};

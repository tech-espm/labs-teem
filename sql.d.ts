import mysql = require("mysql2");
export declare function init(poolConfig: mysql.PoolOptions): void;
export interface SqlInterface {
	/**
		* How many rows were affected by the last execution of `query()` or `scalar()`.
		*/
	affectedRows: number;
	/**
		* The filed information returned by the last execution of `query()` or `scalar()` (can be `null`).
		*/
	resultFields: mysql.FieldPacket[] | null;
	/**
		* Executes the statement given in `queryStr` and returns the resulting rows (if any).
		*
		* @param queryStr The statement to be executed.
		* @param values Optional array of values to be used as the arguments of the ? placeholders used in `queryStr`.
		*/
	query<T>(queryStr: string, values?: any): Promise<T[]>;
	/**
		* Executes the statement given in `queryStr` and returns the first column of the first resulting row (if any).
		*
		* @param queryStr The statement to be executed.
		* @param values Optional array of values to be used as the arguments of the ? placeholders used in `queryStr`.
		*/
	scalar<T>(queryStr: string, values?: any): Promise<T | null>;
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
export declare class Sql implements SqlInterface {
	private connection;
	private pendingTransaction;
	affectedRows: number;
	resultFields: mysql.FieldPacket[] | null;
	static connect<T>(callback: (sql: Sql) => Promise<T>): Promise<T>;
	query<T>(queryStr: string, values?: any): Promise<T[]>;
	scalar<T>(queryStr: string, values?: any): Promise<T | null>;
	beginTransaction(): Promise<void>;
	commit(): Promise<void>;
	rollback(): Promise<void>;
}

import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";

export interface UserProps {
	id?: number;
	username: string;
	email: string;
	password: string;
	profilePicture?: string;
	biography?: string;
}

export class DuplicateEmailError extends Error {
	constructor() {
		super("User with this email already exists.");
	}
}

export class DuplicateUsernameError extends Error {
	constructor() {
		super("User with this username already exists.");
	}
}

export class InvalidCredentialsError extends Error {
	constructor() {
		super("Invalid credentials.");
	}
}

export default class User {

	// Constructor to initialize User instance with SQL connection and properties
	constructor(
		private sql: postgres.Sql<any>,
		public props: UserProps,
	) {}

	// Static method to create a new user
	static async create(sql: postgres.Sql<any>, props: UserProps): Promise<User> {

		const connection = await sql.reserve();

		if(props.email){
			const [row] = await connection<UserProps[]>`
			SELECT * FROM
			users WHERE email = ${props.email}
			`;

			if(row != null){
				throw new DuplicateEmailError;
			}
		}

		if(props.username){
			const [row] = await connection<UserProps[]>`
			SELECT * FROM
			users WHERE username = ${props.username}
			`;

			if(row != null){
				throw new DuplicateUsernameError;
			}
		}

		const [row] = await connection<UserProps[]>`
			INSERT INTO users
				${sql(convertToCase(camelToSnake, props))}
			RETURNING *
		`;
		await connection.release();

		return new User(sql, convertToCase(snakeToCamel, row) as UserProps);
	}

	// Static method to read a user by its ID
	static async read(sql: postgres.Sql<any>, id: number): Promise<User | null> {
		const connection = await sql.reserve();

		const [row] = await connection<UserProps[]>`
			SELECT * FROM
			users WHERE id = ${id}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new User(sql, convertToCase(snakeToCamel, row) as UserProps);
	}

	// Static method to read all users
	static async readAll(sql: postgres.Sql<any>): Promise<User[]> {
		const connection = await sql.reserve();

		const rows = await connection<UserProps[]>`
			SELECT *
			FROM users
		`;

		await connection.release();

		return rows.map(
			(row) =>
				new User(sql, convertToCase(snakeToCamel, row) as UserProps),
		);
	}

	// Method to update the user properties
	async update(updateProps: Partial<UserProps>) {
		const connection = await this.sql.reserve();
	
		let existingUser = await User.findByEmail(this.sql, updateProps.email || "");
		if (existingUser) {
			throw new DuplicateEmailError();
		}

		existingUser = await User.findByUsername(this.sql, updateProps.username || "");
		if (existingUser) {
			throw new DuplicateUsernameError();
		}
	
		const [row] = await connection`
			UPDATE users
			SET
				${this.sql(convertToCase(camelToSnake, updateProps))}
			WHERE
				id = ${this.props.id}
			RETURNING *
		`;
		this.props = { ...this.props, ...convertToCase(snakeToCamel, row) };
	
		await connection.release();
	}

	// Method to delete the user
	async delete() {
		const connection = await this.sql.reserve();

		const result = await connection`
			DELETE FROM users
			WHERE id = ${this.props.id}
		`;

		await connection.release();

		return result.count === 1;
	}

	// Static method to find user by its Email
	static async findByEmail(sql: postgres.Sql<any>, email: string): Promise<User | null> {
		const connection = await sql.reserve();

		const row = await connection<UserProps[]>`
			SELECT *
			FROM users
			WHERE email=${email};
		`;

		await connection.release();

		if (row.length === 0) {
			return null; 	
		}

		return new User(sql, convertToCase(snakeToCamel, row[0]) as UserProps);
	}

	// Static method to find user by Username
	static async findByUsername(sql: postgres.Sql<any>, username: string): Promise<User | null> {
		const connection = await sql.reserve();

		const row = await connection<UserProps[]>`
			SELECT *
			FROM users
			WHERE username=${username};
		`;

		await connection.release();

		if (row.length === 0) {
			return null; 	
		}

		return new User(sql, convertToCase(snakeToCamel, row[0]) as UserProps);
	}

	// Static method to log in a user by email and password
	static async login(
		sql: postgres.Sql<any>,
		email: string,
		password: string,
	): Promise<User> {
		const connection = await sql.reserve();

		const row = await connection<UserProps[]>`
			SELECT *
			FROM users
			WHERE email=${email} AND password=${password};
		`;

		if(row[0] == null){
			return Promise.reject(new InvalidCredentialsError);		
		}

		await connection.release();

		return new User(sql, convertToCase(snakeToCamel, row[0]) as UserProps)
	}
}

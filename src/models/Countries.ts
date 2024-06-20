import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";

export interface CountryProps {
	id?: number;
    name: string;
    iso: string;
}

export default class Country {

	// Constructor to initialize Country instance with SQL connection and properties
	constructor(
		private sql: postgres.Sql<any>,
		public props: CountryProps,
	) {}

	// Static method to read a country by its ID
	static async read(sql: postgres.Sql<any>, id: number): Promise<Country | null> {
		const connection = await sql.reserve();

		const [row] = await connection<CountryProps[]>`
			SELECT * FROM
			countries WHERE id = ${id}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Country(sql, convertToCase(snakeToCamel, row) as CountryProps);
	}

	// Static method to read all the countries
	static async readAll(sql: postgres.Sql<any>): Promise<Country[]> {
		const connection = await sql.reserve();

		const rows = await connection<CountryProps[]>`
			SELECT *
			FROM countries
		`;

		await connection.release();

		return rows.map(
			(row) =>
				new Country(sql, convertToCase(snakeToCamel, row) as CountryProps),
		);
	}

	// Static method to find a country by its NAME
	static async findByName(sql: postgres.Sql<any>, name: string): Promise<Country | null> {
		const connection = await sql.reserve();

		const row = await connection<CountryProps[]>`
			SELECT *
			FROM countries
			WHERE name=${name};
		`;

		await connection.release();

		if (row.length === 0) {
			return null; 	
		}

		return new Country(sql, convertToCase(snakeToCamel, row[0]) as CountryProps);
	}

	// Static method to fins a country by its ISO
	static async findByISO(sql: postgres.Sql<any>, ISO: string): Promise<Country | null> {
		const connection = await sql.reserve();

		const row = await connection<CountryProps[]>`
			SELECT *
			FROM countries
			WHERE iso=${ISO};
		`;

		await connection.release();

		if (row.length === 0) {
			return null; 	
		}

		return new Country(sql, convertToCase(snakeToCamel, row[0]) as CountryProps);
	}
}

import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";

export interface LuggageProps {
	id?: number;
    name: string;
    amount: number;
    type: string;
    tripId?: number;
	userId: number;
}

export default class Luggage {

	// Constructor to initialize Luggage instance with SQL connection and properties
	constructor(
		private sql: postgres.Sql<any>,
		public props: LuggageProps,
	) {}

	// Static method to read a luggage by its ID
	static async read(sql: postgres.Sql<any>, id: number) {
		const connection = await sql.reserve();

		const [row] = await connection<LuggageProps[]>`
			SELECT * FROM
			luggages WHERE id = ${id}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Luggage(sql, convertToCase(snakeToCamel, row) as LuggageProps);
	}

	// Static method to read all luggage by trip ID
	static async readAll(sql: postgres.Sql<any>, tripId: number): Promise<Luggage[]> {
		const connection = await sql.reserve();
	
		const rows = await connection<LuggageProps[]>`
			SELECT * FROM luggages WHERE trip_id = ${tripId}
		`;
	
		await connection.release();
	
		const luggageItems: Luggage[] = rows.map(
			(row) => new Luggage(sql, convertToCase(snakeToCamel, row) as LuggageProps)
		);
	
		return luggageItems;
	}

	// Method to delete the luggage by ID
	async delete() {
		const connection = await this.sql.reserve();

		const result = await connection`
			DELETE FROM luggages
			WHERE id = ${this.props.id}
		`;

		await connection.release();

		return result.count === 1;
	}
}

import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";

export interface ActivityProps {
	id?: number;
    tripId?: number;
	userId: number;
    title: string;
    createdAt?: Date;
    editedAt?: Date;
}

export default class Activity {

	// Constructor to initialize Activity instance with SQL connection and properties
	constructor(
		private sql: postgres.Sql<any>,
		public props: ActivityProps,
	) {}

	// Static method to read an activity by its ID
	static async read(sql: postgres.Sql<any>, id: number) {
		const connection = await sql.reserve();

		const [row] = await connection<ActivityProps[]>`
			SELECT * FROM
			activities WHERE id = ${id}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Activity(sql, convertToCase(snakeToCamel, row) as ActivityProps);
	}

	// Static method to read all activities by trip ID
	static async readAll(
		sql: postgres.Sql<any>,
		tripId: number,
	): Promise<Activity[]> {
		const connection = await sql.reserve();

		const rows = await connection<ActivityProps[]>`
			SELECT *
			FROM activities
			WHERE trip_id = ${tripId}
		`;

		await connection.release();

		return rows.map(
			(row) =>
				new Activity(sql, convertToCase(snakeToCamel, row) as ActivityProps),
		);
	}

	// Method to update the activity properties
	async update(updateProps: Partial<ActivityProps>) {
		const connection = await this.sql.reserve();
		
		const [row] = await connection`
			UPDATE activities
			SET
				${this.sql(convertToCase(camelToSnake, updateProps))}, edited_at = ${createUTCDate()}
			WHERE
				id = ${this.props.id}
			RETURNING *
		`;

		await connection.release();

		this.props = { ...this.props, ...convertToCase(snakeToCamel, row) };
	}

	// Method to delete the activity
	async delete() {
		const connection = await this.sql.reserve();

		const result = await connection`
			DELETE FROM activities
			WHERE id = ${this.props.id}
		`;

		await connection.release();

		return result.count === 1;
	}
}

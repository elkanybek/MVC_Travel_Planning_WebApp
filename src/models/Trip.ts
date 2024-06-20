import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";
import Activity, { ActivityProps } from "./Activity";
import Luggage, { LuggageProps } from "./Luggage";
import Budget, { BudgetProps } from "./Budget";

export interface TripProps {
	id?: number;
    countryId : number;
    title: string;
    description: string;
    status: 'planning'| 'ready' | 'in progress' | 'complete';
    startDate: Date;
    endDate: Date;
	users: number[];
}

export class RemoveLastUserError extends Error {
	constructor() {
		super("Trip cannot have no users.");
	}
}

export default class Trip {

	// Constructor to initialize Trip instance with SQL connection and properties
	constructor(
		private sql: postgres.Sql<any>,
		public props: TripProps,
	) {}

	// Static method to create a new trip
	static async create(sql: postgres.Sql<any>, props: TripProps) {
		const connection = await sql.reserve();

		console.log(sql(convertToCase(camelToSnake, props)));

		const [row] = await connection<TripProps[]>`
			INSERT INTO trips(title, description, status, start_date, end_date, country_id)
			VALUES(${props.title}, ${props.description}, ${props.status}, ${props.startDate}, ${props.endDate}, ${props.countryId})
			RETURNING *
		`;

		for(let i = 0; i < props.users.length; i++){
			await sql`
			INSERT INTO user_trip(user_id, trip_id)
			VALUES(${props.users[i]}, ${row.id})`;
		}
		
		await connection.release();

		let tripProps = convertToCase(snakeToCamel, row) as TripProps
		tripProps.users = props.users;

		return new Trip(sql, tripProps);
	}

	// Static method to read a trip by its ID
	static async read(sql: postgres.Sql<any>, id: number) {
		const connection = await sql.reserve();

		const [row] = await connection<TripProps[]>`
			SELECT * FROM
			trips WHERE id = ${id}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		const usersRows = await sql`
			SELECT * FROM
			user_trip WHERE trip_id = ${id}
		`	

		let userList: number[] = [];
		for(let i: number = 0; i < usersRows.length; i++){
			userList.push(usersRows[i].user_id)
		}

		let tripProps: TripProps = convertToCase(snakeToCamel, row) as TripProps;

		tripProps.users = userList;

		return new Trip(sql, tripProps);
	}

	// Static method to read all trips
	static async readAll(
		sql: postgres.Sql<any>,
		userId: number,
	): Promise<Trip[]> {
		const rows = await sql`
			SELECT trip_id
			FROM user_trip
			WHERE user_id = ${userId}
		`;

		let tripList: Trip[] = []
		for(let i = 0; i < rows.length; i++){
			if(rows[i] != undefined){
				let trip: Trip | null = await Trip.read(sql, rows[i].trip_id);
				if(trip){
					tripList.push(trip);
				}
			}
		}
		return tripList;
	}

	// Method to update the trip properties
	async update(updateProps: Partial<TripProps>) {
		const connection = await this.sql.reserve();

		const temp = convertToCase(camelToSnake, updateProps);

		const [row] = await connection`
			UPDATE trips
			SET
				${this.sql(convertToCase(camelToSnake, updateProps))}
			WHERE
				id = ${this.props.id}
			RETURNING *
		`;

		await connection.release();

		this.props = { ...this.props, ...convertToCase(snakeToCamel, row) };
	}

	// Method to delete the trip
	async delete() {
		const connection = await this.sql.reserve();

		const result = await connection`
			DELETE FROM trips
			WHERE id = ${this.props.id}
		`;

		await connection.release();

		return result.count === 1;
	}

	// Method to update the status of the trip
	async updateStatus(new_status: "planning" | "ready" | "in progress" | "complete") {
		await this.update({
			status: new_status,
		});
	}

	// Method to add users to a trip
	async addUser(userId: number){
		const connection = await this.sql.reserve();
		const [result] = await connection`
			SELECT * FROM users
			WHERE id = ${userId}
		`

		if(result){
			this.props.users.push(userId)
			await connection`
				INSERT INTO user_trip(user_id, trip_id)
				VALUES(${userId}, ${this.props.id})
			`
		}

		connection.release();
	}

	// Method to remove users from a trip
	async removeUser(userId: number){
		if(this.props.users.length === 1){
			throw new RemoveLastUserError;
		}

		const connection = await this.sql.reserve();
		const [result] = await connection`
			SELECT * FROM users
			WHERE id = ${userId}
		`

		if(result){
			const index = this.props.users.indexOf(userId);
			if(index > -1){
				this.props.users.splice(index, 1);
			}
			await connection`
				DELETE FROM user_trip
				WHERE user_id = ${userId} AND trip_id = ${this.props.id}
			`
		}

		connection.release();
	}

	// Method to add activities to a trip
	async addActivity(props: ActivityProps){
		props.tripId = this.props.id;

		const connection = await this.sql.reserve();

		const [row] = await connection<ActivityProps[]>`
			INSERT INTO activities
				${this.sql(convertToCase(camelToSnake, props))}
			RETURNING *
		`;

		await connection.release();

		return new Activity(this.sql, convertToCase(snakeToCamel, row) as ActivityProps);
	}

	// Method to add luggages to a trip
	async addLuggage(props: LuggageProps){
		props.tripId = this.props.id;
		const connection = await this.sql.reserve();

		const [row] = await connection<LuggageProps[]>`
			INSERT INTO luggages
				${this.sql(convertToCase(camelToSnake, props))}
			RETURNING *
		`;

		await connection.release();

		return new Luggage(this.sql, convertToCase(snakeToCamel, row) as LuggageProps);
	}

	// Method to add budgets to a trip
	async addBudget(props: BudgetProps){
		props.tripId = this.props.id
		const connection = await this.sql.reserve();

		props.remainder = props.spendingLimit - props.amountSpent;

		const [row] = await connection<BudgetProps[]>`
			INSERT INTO budgets
				${this.sql(convertToCase(camelToSnake, props))}
			RETURNING *
		`;

		await connection.release();

		return new Budget(this.sql, convertToCase(snakeToCamel, row) as BudgetProps);
	}
}

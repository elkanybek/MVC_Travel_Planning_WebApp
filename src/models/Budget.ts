import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";

export interface BudgetProps {
	id?: number;
    title: string;
    amountSpent: number;
    spendingLimit: number;
    remainder?: number;
    tripId?: number;
	userId: number;
}

export default class Budget {

	// Constructor to initialize Budget instance with SQL connection and properties
	constructor(
		private sql: postgres.Sql<any>,
		public props: BudgetProps,
	) {}

	// Static method to read a budget by its ID
	static async read(sql: postgres.Sql<any>, id: number) {
		const connection = await sql.reserve();

		const [row] = await connection<BudgetProps[]>`
			SELECT * FROM
			budgets WHERE id = ${id}
		`;

		await connection.release();

		if (!row) {
			return null;
		}

		return new Budget(sql, convertToCase(snakeToCamel, row) as BudgetProps);
	}

	// Static method to read all budget by trip ID
	static async readAll(
		sql: postgres.Sql<any>,
		tripId: number,
	): Promise<Budget[]> {
		const connection = await sql.reserve();

		const rows = await connection<BudgetProps[]>`
			SELECT *
			FROM budgets
			WHERE trip_id = ${tripId}
		`;

		await connection.release();

		return rows.map(
			(row) =>
				new Budget(sql, convertToCase(snakeToCamel, row) as BudgetProps),
		);
	}

	// Method to delete the budget by ID
	async delete() {
		const connection = await this.sql.reserve();

		const result = await connection`
			DELETE FROM budgets
			WHERE id = ${this.props.id}
		`;

		await connection.release();

		return result.count === 1;
	}

	// Method to spend an amount from the budget
	async spendFromBudget(amount: number){
		this.props.amountSpent += amount
		this.props.remainder = this.props.spendingLimit - this.props.amountSpent;

		const connection = await this.sql.reserve();

		const [row] = await connection`
			UPDATE budgets
			SET
				amount_spent = ${this.props.amountSpent}, remainder = ${this.props.remainder}
			WHERE
				id = ${this.props.id}
			RETURNING *
		`;

		await connection.release();
	}

	// Method to add funds to the budget
	async addFundsToBudget(amountToAdd: number){
		this.props.spendingLimit = Number(this.props.spendingLimit) + amountToAdd;
		this.props.remainder = Number(this.props.spendingLimit) - Number(this.props.amountSpent);

		const connection = await this.sql.reserve();

		const [row] = await connection`
			UPDATE budgets
			SET
				remainder = ${this.props.remainder}, spending_limit = ${this.props.spendingLimit}
			WHERE
				id = ${this.props.id}
			RETURNING *
		`;

		await connection.release();
	}

	// Method to remove funds from the budget
	async removeFundsFromBudget(amount: number){
		this.props.spendingLimit -= amount
		this.props.remainder = this.props.spendingLimit - this.props.amountSpent;

		const connection = await this.sql.reserve();

		const [row] = await connection`
			UPDATE budgets
			SET
				remainder = ${this.props.remainder}, spending_limit = ${this.props.spendingLimit}
			WHERE
				id = ${this.props.id}
			RETURNING *
		`;

		await connection.release();
	}
}

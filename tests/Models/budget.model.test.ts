import postgres from "postgres";
import Trip, { TripProps } from "../../src/models/Trip";
import { test, describe, expect, afterEach, beforeEach, afterAll } from "vitest";
import { createUTCDate } from "../../src/utils";
import Budget, { BudgetProps } from "../../src/models/Budget";
import User, { UserProps } from "../../src/models/User";
import { b } from "vitest/dist/suite-IbNSsUWN";

describe("Budget CRUD operations", () => {
	// Set up the connection to the DB.
	const sql = postgres({
		database: "TravelooDB",
	});

	/**
	 * Helper function to create a Trip with default or provided properties.
	 * @see https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR#short-circuit_evaluation
	 * @param props The properties of the Trip.
	 * @default title: "Test Trip"
	 * @default description: "This is a test Trip"
	 * @default status: "incomplete"
	 * @default startDate: new Date(2024, 9, 13)
	 * @default endDate: new Date(2025, 4, 28)
	 * @default countryId: 1
	 * @default users: [1]
	 * @returns A new Trip object that has been persisted in the DB.
	 */
	const createTrip = async (props: Partial<TripProps> = {}) => {
		const tripProps: TripProps = {
			title: props.title || "Test Trip",
			description: props.description || "This is a test trip",
			status: props.status || "planning",
			startDate: props.startDate || new Date(2024, 9, 13),
			endDate: props.endDate || new Date(2025, 4, 28),
			countryId: props.countryId || 1,
			users: props.users || [1]
		};

		return await Trip.create(sql, tripProps);
	};

	const createUser = async (props: Partial<UserProps> = {}) => {
		return await User.create(sql, {
			email: props.email || "user@email.com",
			password: props.password || "password",
			username: props.username || "user",
		});
	};

	beforeEach(async () => {
		await createUser();
	});

	/**
	 * Clean up the database after each test. This function deletes all the rows
	 * from the trips, users, activities, luggages and budgets tables and resets the sequence for each table.
	 * @see https://www.postgresql.org/docs/13/sql-altersequence.html
	 */
	afterEach(async () => {
		const tables = ["users", "trips", "activities", "luggages", "budgets"];

		try {
			for (const table of tables) {
				await sql.unsafe(`DELETE FROM ${table}`);
				await sql.unsafe(
					`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1;`,
				);
			}

			await sql.unsafe(`DELETE FROM user_trip`);
		} catch (error) {
			console.error(error);
		}
	});

	test("Budget was added to the Trip.", async () => {
		const trip = await createTrip();
		const budgetProps: BudgetProps = {
			title: "Test Budget Item",
			spendingLimit: 1000.00,
			amountSpent: 0,
			userId: 1,
		};

		await trip.addBudget(budgetProps);

		const [
			{
				props: { title, spendingLimit, amountSpent, userId  },
			},
		] = await Budget.readAll(sql, trip.props.id!);

		expect(title).toBe(budgetProps.title);
		expect(spendingLimit).toBe(budgetProps.spendingLimit.toString());
		expect(amountSpent).toBe(budgetProps.amountSpent.toString());
		expect(userId).toBe(budgetProps.userId);
	});

	test("Budget was retrieved.", async () => {
		const trip = await createTrip();
		const budgetProps: BudgetProps = {
			title: "Test Budget Item",
			spendingLimit: 1000,
			amountSpent: 0,
			userId: 1,
		};
		const budget = await trip.addBudget(budgetProps);

		const readBudget = await Budget.read(sql, budget.props.id!);

		//Check if the title, description, and status of the read trip are as expected.
		expect(readBudget?.props.title).toBe("Test Budget Item");
		expect(readBudget?.props.spendingLimit).toBe('1000');
		expect(readBudget?.props.amountSpent).toBe('0');
	});

	test("Budget was removed from the Trip.", async () => {
		const trip = await createTrip();
		const budgetProps: BudgetProps = {
			title: "Test Budget Item",
			spendingLimit: 1000,
			amountSpent: 0,
			userId: 1,
		};

		const budget = await trip.addBudget(budgetProps);

		await budget.delete();

		const budgets = await Budget.readAll(sql, trip.props.id!);

		expect(budgets).toHaveLength(0);
	});

	test("Budgets were listed for the Trip.", async () => {
		const trip = await createTrip();
		const budget1 = await trip.addBudget({
			title: "Test Budget Item",
			spendingLimit: 1000,
			amountSpent: 0,
			userId: 1,
		});
		const budget2 = await trip.addBudget({
			title: "Test Budget Item",
			spendingLimit: 1000,
			amountSpent: 0,
			userId: 1,
		});
		const budgets = await Budget.readAll(sql, trip.props.id!);

		expect(budgets).toContainEqual(budget1);
		expect(budgets).toContainEqual(budget2);
	});

	test("Budget was spent from successfully.", async () => {
		const trip = await createTrip();
		const budgetProps: BudgetProps = {
			title: "Test Budget Item",
			spendingLimit: 1000,
			amountSpent: 0,
			userId: 1,
		};

		const budget = await trip.addBudget(budgetProps);
		await budget.spendFromBudget(50);

		const updatedBudget = await Budget.read(sql, budget.props.id!)
		expect(updatedBudget!.props.amountSpent).toBe('50');
		expect(updatedBudget!.props.remainder).toBe('950');
	});

	test("Budget limit was increased successfully.", async () => {
		const trip = await createTrip();
		const budgetProps: BudgetProps = {
			title: "Test Budget Item",
			spendingLimit: 1000,
			amountSpent: 0,
			userId: 1,
		};

		const budget = await trip.addBudget(budgetProps);
		await budget.addFundsToBudget(100);

		const updatedBudget = await Budget.read(sql, budget.props.id!);
		expect(updatedBudget!.props.spendingLimit).toBe('1100');
		expect(updatedBudget!.props.remainder).toBe('1100');
	});

	test("Budget limit was decreased successfully.", async () => {
		const trip = await createTrip();
		const budgetProps: BudgetProps = {
			title: "Test Budget Item",
			spendingLimit: 1000,
			amountSpent: 0,
			userId: 1,
		};

		const budget = await trip.addBudget(budgetProps);
		await budget.removeFundsFromBudget(100);

		const updatedBudget = await Budget.read(sql, budget.props.id!)
		expect(updatedBudget!.props.spendingLimit).toBe('900');
		expect(updatedBudget!.props.remainder).toBe('900');
	});
});

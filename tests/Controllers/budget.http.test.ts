import postgres from "postgres";
import Trip, { TripProps } from "../../src/models/Trip";
import Server from "../../src/Server";
import { StatusCode } from "../../src/router/Response";
import { HttpResponse, makeHttpRequest } from "./../client";
import { test, describe, expect, afterEach, afterAll, beforeAll, beforeEach } from "vitest";
import { createUTCDate } from "../../src/utils";
import User, { UserProps } from "../../src/models/User";
import { ActivityProps } from "../../src/models/Activity";
import { aC } from "vitest/dist/reporters-yx5ZTtEV";
import { BudgetProps } from "../../src/models/Budget";

describe("Budget HTTP operations", () => {
    const sql = postgres({
        database: "TravelooDB",
    });

    const server = new Server({
        host: "localhost",
        port: 3000,
        sql,
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

    const login = async (
        email: string = "user@email.com",
        password: string = "password",
    ) => {
        await makeHttpRequest("POST", "/login", {
            email,
            password,
        });
    };

    beforeEach(async () => {
        await createUser();
    });

    beforeAll(async () => {
        await server.start();
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

    // Close the connection to the DB after all tests are done.
    afterAll(async () => {
        await sql.end();
        await server.stop();
    });

    test("Budget was added to the Trip.", async () => {
        await login();
        const trip = await createTrip();
        const { statusCode, body }: HttpResponse = await makeHttpRequest(
            "POST",
            `/trips/${trip.props.id}/budget`,
            {
                title: "Test Budget",
                amountSpent: 0,
                spendingLimit: 100,
            },
        );

        expect(statusCode).toBe(StatusCode.Created);
        expect(body.message).toBe("Budget created successfully!");
        expect(Object.keys(body.payload.budget).includes("id")).toBe(true);
        expect(Object.keys(body.payload.budget).includes("title")).toBe(true);
        expect(Object.keys(body.payload.budget).includes("amountSpent")).toBe(true);
        expect(Object.keys(body.payload.budget).includes("spendingLimit")).toBe(true);
        expect(Object.keys(body.payload.budget).includes("tripId")).toBe(true);
        expect(body.payload.budget.title).toBe("Test Budget");
        expect(body.payload.budget.amountSpent).toBe('0');
        expect(body.payload.budget.spendingLimit).toBe('100');
        expect(body.payload.budget.tripId).toBe(trip.props.id);
    });

    test("Budgets were listed for the Trip.", async () => {
        await login()
        const trip = await createTrip();
        const budgetProps: BudgetProps = {
            title: "Test Budget",
            amountSpent: 0,
            spendingLimit: 100,
            userId: 1
        };

        await trip.addBudget(budgetProps);

        const { statusCode, body }: HttpResponse = await makeHttpRequest(
            "GET",
            `/trips/${trip.props.id}/budget`,
        );

        expect(statusCode).toBe(StatusCode.OK);
        expect(body.message).toBe("Budget list retrieved");
        expect(body.payload.budgets).toBeInstanceOf(Array);
        expect(body.payload.budgets[0].title).toBe(budgetProps.title);
        expect(body.payload.budgets[0].amountSpent).toBe(budgetProps.amountSpent.toString());
        expect(body.payload.budgets[0].spendingLimit).toBe(budgetProps.spendingLimit.toString());
        expect(body.payload.budgets[0].tripId).toBe(budgetProps.tripId);
    });

    test("Budget was retrieved.", async () => {
        await login();
        const trip = await createTrip();
        const budgetProps: BudgetProps = {
            title: "Test Budget",
            amountSpent: 0,
            spendingLimit: 100,
            userId: 1
        };

        await trip.addBudget(budgetProps);

        const { statusCode, body }: HttpResponse = await makeHttpRequest(
            "GET",
            `/trips/${trip.props.id}/budget/1`,
        );

        expect(statusCode).toBe(StatusCode.OK);
        expect(body.message).toBe("Budget retrieved");
        expect(body.payload.budget).not.toBeInstanceOf(Array);
        expect(Object.keys(body.payload.budget).includes("id")).toBe(true);
        expect(Object.keys(body.payload.budget).includes("title")).toBe(true);
        expect(Object.keys(body.payload.budget).includes("amountSpent")).toBe(true);
        expect(Object.keys(body.payload.budget).includes("spendingLimit")).toBe(true);
        expect(Object.keys(body.payload.budget).includes("tripId")).toBe(true);
        expect(body.payload.budget.title).toBe(budgetProps.title);
        expect(body.payload.budget.amountSpent).toBe(budgetProps.amountSpent.toString());
        expect(body.payload.budget.spendingLimit).toBe(budgetProps.spendingLimit.toString());
        expect(body.payload.budget.tripId).toBe(budgetProps.tripId);
    });

    test("Budget was deleted.", async () => {
        await login();
        const trip = await createTrip();
        const budgetProps: BudgetProps = {
            title: "Test Budget",
            amountSpent: 0,
            spendingLimit: 100,
            userId: 1
        };

        await trip.addBudget(budgetProps);

        const { statusCode, body }: HttpResponse = await makeHttpRequest(
            "DELETE",
            `/trips/${trip.props.id}/budget/1`,
        );

        expect(statusCode).toBe(StatusCode.OK);
        expect(body.message).toBe("Budget deleted successfully!");
    });
});

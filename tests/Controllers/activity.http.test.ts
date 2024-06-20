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

describe("Activity HTTP operations", () => {
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

    test("Activity was added to the Trip.", async () => {
        await login();
        const trip = await createTrip();
        const { statusCode, body }: HttpResponse = await makeHttpRequest(
            "POST",
            `/trips/${trip.props.id}/activities`,
            {
                title: "Test Activity",
            },
        );

        expect(statusCode).toBe(StatusCode.Created);
        expect(body.message).toBe("Activity created successfully!");
        expect(Object.keys(body.payload.activity).includes("id")).toBe(true);
        expect(Object.keys(body.payload.activity).includes("title")).toBe(true);
        expect(Object.keys(body.payload.activity).includes("tripId")).toBe(true);
        expect(body.payload.activity.title).toBe("Test Activity");
        expect(body.payload.activity.tripId).toBe(trip.props.id);
    });

    test("Activities were listed for the Trip.", async () => {
        await login()
        const trip = await createTrip();
        const activityProps: ActivityProps = {
            title: "Activity 1",
            tripId: trip.props.id!,
            userId: 1
        };

        await trip.addActivity(activityProps);

        const { statusCode, body }: HttpResponse = await makeHttpRequest(
            "GET",
            `/trips/${trip.props.id}/activities`,
        );

        expect(statusCode).toBe(StatusCode.OK);
        expect(body.message).toBe("Activity list retrieved");
        expect(body.payload.activities).toBeInstanceOf(Array);
        expect(body.payload.activities[0].title).toBe(activityProps.title);
        expect(body.payload.activities[0].tripId).toBe(activityProps.tripId);
    });

    test("Activity was retrieved.", async () => {
        await login();
        const trip = await createTrip();
        const activityProps: ActivityProps = {
            title: "Activity 1",
            tripId: trip.props.id!,
            userId: 1
        };

        await trip.addActivity(activityProps);

        const { statusCode, body }: HttpResponse = await makeHttpRequest(
            "GET",
            `/trips/${trip.props.id}/activities/1`,
        );

        expect(statusCode).toBe(StatusCode.OK);
        expect(body.message).toBe("Activity retrieved");
        expect(body.payload.activity).not.toBeInstanceOf(Array);
        expect(Object.keys(body.payload.activity).includes("id")).toBe(true);
        expect(Object.keys(body.payload.activity).includes("title")).toBe(true);
        expect(Object.keys(body.payload.activity).includes("tripId")).toBe(true);
        expect(body.payload.activity.title).toBe(activityProps.title);
        expect(body.payload.activity.tripId).toBe(activityProps.tripId);
    });

    test("Activity was updated.", async () => {
        await login();
        const trip = await createTrip();
        const activityProps: ActivityProps = {
            title: "Activity 1",
            tripId: trip.props.id!,
            userId: 1
        };

        await trip.addActivity(activityProps);

        const { statusCode, body }: HttpResponse = await makeHttpRequest(
            "PUT",
            `/trips/${trip.props.id}/activities/1`,
            {
                title: "Updated Test Activity",
            },
        );

        expect(statusCode).toBe(StatusCode.OK);
        expect(body.message).toBe("Activity updated successfully!");
        expect(body.payload.activity.title).toBe("Updated Test Activity");
        expect(body.payload.activity.tripId).toBe(trip.props.id);
    });

    test("Activity was deleted.", async () => {
        await login();
        const trip = await createTrip();
        const activityProps: ActivityProps = {
            title: "Activity 1",
            tripId: trip.props.id!,
            userId: 1
        };

        await trip.addActivity(activityProps);

        const { statusCode, body }: HttpResponse = await makeHttpRequest(
            "DELETE",
            `/trips/${trip.props.id}/activities/1`,
        );

        expect(statusCode).toBe(StatusCode.OK);
        expect(body.message).toBe("Activity deleted successfully!");
    });
});

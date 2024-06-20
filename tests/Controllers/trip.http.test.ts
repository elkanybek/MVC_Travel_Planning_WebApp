import postgres from "postgres";
import Trip, { TripProps } from "../../src/models/Trip";
import Server from "../../src/Server";
import { StatusCode } from "../../src/router/Response";
import { HttpResponse, makeHttpRequest } from "./../client";
import { test, describe, expect, afterEach, afterAll, beforeAll, beforeEach } from "vitest";
import { createUTCDate } from "../../src/utils";
import User, { UserProps } from "../../src/models/User";

describe("Trip HTTP operations", () => {
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

	test("Homepage was retrieved successfully.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/",
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(true);
		expect(body.message).toBe("Homepage!");
	});

	test("Invalid path returned error.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/trps",
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(false);
		expect(body.message).toBe("Invalid route: GET /trps");
	});

	test("Trip was created.", async () => {
		await login();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/trips",
			{
				title: "Test Trip",
				description: "This is a test trip",
				status: "planning",
				startDate:  new Date(2024, 9, 13),
				endDate: new Date(2025, 4, 28),
				countryId: 1,
				users: [1]
			},
		);

		expect(statusCode).toBe(StatusCode.Created);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(true);
		expect(body.message).toBe("Trip created successfully!");
		expect(Object.keys(body.payload.trip).includes("id")).toBe(true);
		expect(Object.keys(body.payload.trip).includes("title")).toBe(true);
		expect(Object.keys(body.payload.trip).includes("description")).toBe(
			true,
		);
		expect(Object.keys(body.payload.trip).includes("status")).toBe(true);
		expect(Object.keys(body.payload.trip).includes("startDate")).toBe(true);
		expect(Object.keys(body.payload.trip).includes("endDate")).toBe(true);
		expect(Object.keys(body.payload.trip).includes("countryId")).toBe(true);
		expect(Object.keys(body.payload.trip).includes("users")).toBe(true);-



		expect(body.payload.trip.id).toBe(1);
		expect(body.payload.trip.title).toBe("Test Trip");
		expect(body.payload.trip.description).toBe("This is a test trip");
		expect(body.payload.trip.status).toBe("planning");
		expect(body.payload.trip.countryId).toBe(1);
		expect(body.payload.trip.users.length).toBe(1);
		expect(body.payload.trip.users[0]).toBe(1);
		expect(body.payload.trip.startDate).not.toBeNull();
		expect(body.payload.trip.endDate).not.toBeNull();
	});

	test("Trip was not created due to missing title.", async () => {
		await login();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/trips",
			{
				description: "This is a test trip",
				status: "planning",
				startDate:  new Date(2024, 9, 13),
				endDate: new Date(2025, 4, 28),
				countryId: 1,
				users: [1]
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(true);
		expect(body.message).toBe(
			"Request body must include all required fields.",
		);
		expect(body.payload.trip).toBeUndefined();
	});

	test("Trip was retrieved.", async () => {
		await login();
		const trip = await createTrip();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			`/trips/${trip.props.id}`,
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Trip retrieved");
		expect(body.payload.trip.title).toBe(trip.props.title);
		expect(body.payload.trip.description).toBe(trip.props.description);
		expect(body.payload.trip.status).toBe(trip.props.status);
		expect(body.payload.trip.countryId).toBe(trip.props.countryId);
		expect(body.payload.trip.users.length).toBe(1);
		expect(body.payload.trip.users[0]).toBe(1);
	});

	test("Trip was not retrieved due to invalid ID.", async () => {
		await login();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/trips/abc",
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Invalid ID");
		expect(body.payload).toBeUndefined();
	});

	test("Trip was not retrieved due to non-existent ID.", async () => {
		await login();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/trips/1",
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(body.message).toBe("Not found");
		expect(body.payload.trip).toBeUndefined();
	});

	test("Trip was updated.", async () => {
		await login();
		const trip = await createTrip();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			`/trips/${trip.props.id}`,
			{
				title: "Updated Test Trip",
			},
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Trip updated successfully!");
		expect(body.payload.trip.title).toBe("Updated Test Trip");
		expect(body.payload.trip.description).toBe(trip.props.description);
		expect(body.payload.trip.status).toBe(trip.props.status);
		expect(body.payload.trip.countryId).toBe(trip.props.countryId);
		expect(body.payload.trip.users.length).toBe(1);
		expect(body.payload.trip.users[0]).toBe(1);
	});

	test("Trip was not updated due to invalid ID.", async () => {
		await login();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			"/trips/abc",
			{
				title: "Updated Test Trip",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Invalid ID");
		expect(body.payload).toBeUndefined();
	});

	test("Trip was not updated due to non-existent ID.", async () => {
		await login();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			"/trips/1",
			{
				title: "Updated Test Trip",
			},
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(body.message).toBe("Not found");
		expect(body.payload.trip).toBeUndefined();
	});

	test("Trip was deleted.", async () => {
		await login();
		const trip = await createTrip();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"DELETE",
			`/trips/${trip.props.id}`,
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Trip deleted successfully!");
	});

	test("Trip was not deleted due to invalid ID.", async () => {
		await login();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"DELETE",
			"/trips/abc",
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Invalid ID");
		expect(body.payload).toBeUndefined();
	});

	test("Trip was not deleted due to non-existent ID.", async () => {
		await login();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"DELETE",
			"/trips/1",
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(body.message).toBe("Not found");
		expect(body.payload.trip).toBeUndefined();
	});

	test("Trip status was updated.", async () => {
		await login();
		const trip = await createTrip();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			`/trips/${trip.props.id}/update-status`,
			{
				status: "ready",
			},
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Trip status updated!");
		expect(body.payload.trip.status).toBe("ready");
	});

	test("Trip status was not updated due to invalid ID.", async () => {
		await login();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			"/trips/abc/update-status",
			{
				status: "ready",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Invalid ID");
		expect(body.payload.trips).toBeUndefined();
	});

	test("Trip status was not updated due to non-existent ID.", async () => {
		await login();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			"/trips/1/update-status",
			{
				status: "ready",
			},
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(body.message).toBe("Not found");
		expect(body.payload.trips).toBeUndefined();
	});

	test("Trips were listed.", async () => {
		await login();
		const trip1 = await createTrip();
		const trip2 = await createTrip();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/trips",
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Trip list retrieved");
		expect(body.payload.trips).toBeInstanceOf(Array);

		expect(body.payload.trips[0].title).toBe(trip1.props.title);
		expect(body.payload.trips[0].description).toBe(trip1.props.description);
		expect(body.payload.trips[0].status).toBe(trip1.props.status);
		expect(body.payload.trips[0].countryId).toBe(trip1.props.countryId);
		expect(body.payload.trips[0].users.length).toBe(1);
		expect(body.payload.trips[0].users[0]).toBe(1);

		expect(body.payload.trips[1].title).toBe(trip2.props.title);
		expect(body.payload.trips[1].description).toBe(trip2.props.description);
		expect(body.payload.trips[1].status).toBe(trip2.props.status);
		expect(body.payload.trips[1].countryId).toBe(trip2.props.countryId);
		expect(body.payload.trips[1].users.length).toBe(1);
		expect(body.payload.trips[1].users[0]).toBe(1);
	});

	test("User was added to Trip.", async () => {
		await login()
		const trip1 = await createTrip();

		let newUser = await User.create(sql, {
			email: "user2@email.com",
			password: "password",
			username: "user2",
		});

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/trips/1/users",
			{
				email: "user2@email.com"
			}
		);

		const updatedTrip = await Trip.read(sql, trip1.props.id!);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("User added to the Trip!");

		expect(updatedTrip?.props.users.length).toBe(2);
		expect(updatedTrip?.props.users).toContain(2);
	});

	test("User was removed from Trip", async () => {
		await login()
		const trip1 = await createTrip();

		let newUser = await User.create(sql, {
			email: "user2@email.com",
			password: "password",
			username: "user2",
		});

		await trip1.addUser(2);

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"DELETE",
			"/trips/1/users/1",
		);

		const updatedTrip = await Trip.read(sql, trip1.props.id!);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("User removed from the Trip!");

		expect(updatedTrip?.props.users.length).toBe(1);
		expect(updatedTrip?.props.users).toContain(2);
	});
});

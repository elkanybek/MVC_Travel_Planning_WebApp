import postgres from "postgres";
import User, { UserProps } from "../../src/models/User";
import Server from "../../src/Server";
import { StatusCode } from "../../src/router/Response";
import { HttpResponse, clearCookieJar, makeHttpRequest } from "./../client";
import { test, describe, expect, afterEach, beforeAll, afterAll } from "vitest";
import { createUTCDate } from "../../src/utils";

describe("User HTTP operations", () => {
	const sql = postgres({
		database: "TravelooDB",
	});

	const server = new Server({
		host: "localhost",
		port: 3000,
		sql,
	});

	const createUser = async (props: Partial<UserProps> = {}) => {
		return await User.create(sql, {
			email: props.email || "user@email.com",
            username: props.username || "user",
			password: props.password || "password",
		});
	};

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

	test("User was created.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
				email: "user@email.com",
                username: "user",
				password: "password",
                confirmPassword: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.Created);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(true);
		expect(body.message).toBe("User created");
		expect(Object.keys(body.payload).includes("user")).toBe(true);
		expect(body.payload.user.email).toBe("user@email.com");
        expect(body.payload.user.username).toBe("user");
		expect(body.payload.user.password).toBe("password");
	});

	test("User was not created due to missing email.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
                username: "user",
				password: "password",
                confirmPassword: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Missing email.");
	});

    test("User was not created due to missing username.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
                email: "email@gmail.com",
				password: "password",
                confirmPassword: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Missing username.");
	});

	test("User was not created due to missing password.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
				email: "user@email.com",
                username: "user",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Missing password.");
	});

    test("User was not created due to mismatched passwords.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
				email: "user@email.com",
                username: "user",
				password: "password",
				confirmPassword: "password123",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Passwords do not match");
	});

	test("User was not created due to duplicate email.", async () => {
		await createUser({ email: "user@email.com" });

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
				email: "user@email.com",
                username: "user12",
				password: "password",
                confirmPassword: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("User with this email already exists.");
	});

    test("User was not created due to duplicate username.", async () => {
		await createUser({ username: "user11" });

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
				email: "user3@email.com",
                username: "user11",
				password: "password",
				confirmPassword: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("User with this username already exists.");
	});

	test("User was logged in.", async () => {
		const user = await createUser();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/login",
			{
				email: user.props.email,
                username: "user",
				password: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(true);
		expect(body.message).toBe("Logged in successfully!");
		expect(Object.keys(body.payload).includes("user")).toBe(true);
		expect(body.payload.user.email).toBe(user.props.email);
        expect(body.payload.user.username).toBe("user");
		expect(body.payload.user.password).toBe("password");
	});

	test("User was not logged in due to invalid email.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/login",
			{
				email: "nonexistentemail",
				password: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Invalid credentials.");
	});

	test("User was not logged in due to invalid password.", async () => {
		const user = await createUser();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/login",
			{
				email: user.props.email,
				password: "invalidpassword",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Invalid credentials.");
	});

});

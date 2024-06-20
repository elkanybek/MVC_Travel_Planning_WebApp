import postgres from "postgres";
import Trip, { TripProps } from "../../src/models/Trip";
import { test, describe, expect, afterEach, beforeEach, afterAll } from "vitest";
import User, { UserProps } from "../../src/models/User";

describe("Trip CRUD operations", () => {
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

	test("Trip was created.", async () => {
		// Create a new trip.
		const trip = await createTrip({ title: "Test Trip 2" });

		// Check if the title, description, and status of the created trip are as expected.
		expect(trip.props.title).toBe("Test Trip 2");
		expect(trip.props.description).toBe("This is a test trip");
		expect(trip.props.status).toBe("planning");
	});

	test("Trip was retrieved.", async () => {
		// Create a new trip.
		const trip = await createTrip();

		const readTrip = await Trip.read(sql, trip.props.id!);

		//Check if the title, description, and status of the read trip are as expected.
		expect(readTrip?.props.title).toBe("Test Trip");
		expect(readTrip?.props.description).toBe("This is a test trip");
		expect(readTrip?.props.status).toBe("planning");
	});

	test("Trips were listed.", async () => {
		// Create a new trip.
		const trip1 = await createTrip();
		const trip2 = await createTrip();
		const trip3 = await createTrip();

		// List all the trips
		const trips = await Trip.readAll(sql, 1);

		// Check if the created trip is in the list of trips.
		expect(trips).toBeInstanceOf(Array);
		expect(trips).toContainEqual(trip1);
		expect(trips).toContainEqual(trip2);
		expect(trips).toContainEqual(trip3);
	});

	test("Trip was updated.", async () => {
		// Create a new trip.
		const trip = await createTrip();

		// Update the trip in the database.
		await trip.update({ title: "Updated Test Trip" });

		// Read the updated trip from the database.
		const updatedTrip = await Trip.read(sql, trip.props.id!);

		// Check if the title of the updated trip is as expected.
		expect(updatedTrip).not.toBeNull();
		expect(updatedTrip?.props.title).toBe("Updated Test Trip");
	});

	test("Trip was deleted.", async () => {
		// Create a new trip.
		const trip = await createTrip();

		// Delete the trip from the database.
		await trip.delete();

		// Read the deleted trip from the database.
		const deletedTrip = await Trip.read(sql, trip.props.id!);

		// Check if the deleted trip is null.
		expect(deletedTrip).toBeNull();
	});

	test("Trip status was changed.", async () => {
		// Create a trip.
		const trip = await createTrip();

		// Check if the status of the trip is planning.
		expect(trip.props.status).toBe("planning");

		//Change the status
		await trip.updateStatus("complete");

		const updatedTrip = await Trip.read(sql, trip.props.id!);

		// Check if the status of the trip is complete.
		expect(updatedTrip?.props.status).toBe("complete");
	});

	test("User was added to the trip.", async () => {
		// Create a trip.
		const trip = await createTrip();

		// Create another user
		const newUser = await createUser({ email: "user2@email.com", username: "user2"});

		// Add the user to the trip
		await trip.addUser(newUser.props.id!)

		// Read the changed trip
		const changedTrip = await Trip.read(sql, trip.props.id!)

		// Check if the user was added
		expect(changedTrip?.props.users.length).toBe(2)
		expect(changedTrip?.props.users).toContainEqual(newUser.props.id)
	});

	test("User was removed to the trip.", async () => {
		// Create a trip.
		const trip = await createTrip();

		// Create users
		const user2 = await createUser({ email: "user2@email.com", username: "user2"});
		const user3 = await createUser({ email: "user3@email.com", username: "user3"});

		// Add the users to the trip
		await trip.addUser(user2.props.id!)
		await trip.addUser(user3.props.id!)

		// Remove a user from the trip
		await trip.removeUser(user2.props.id!)

		// Read the changed trip
		const changedTrip = await Trip.read(sql, trip.props.id!)

		// Check if the user was removed
		expect(changedTrip?.props.users.length).toBe(2)
		expect(changedTrip?.props.users.find((x: any) => x == user2.props.id)).toBeFalsy()
	});

	test("Last user was not removed to the trip.", async () => {
		// Create a trip.
		const trip = await createTrip();

		//Remove the last user
		await expect(async () => {
			await trip.removeUser(1);
		}).rejects.toThrow("Trip cannot have no users.");
	});
});
import postgres from "postgres";
import Trip, { TripProps } from "../../src/models/Trip";
import Activity, { ActivityProps } from "../../src/models/Activity";
import { test, describe, expect, afterEach, afterAll, beforeEach } from "vitest";
import { createUTCDate } from "../../src/utils";
import User, { UserProps } from "../../src/models/User";

describe("Activity CRUD operations", () => {
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

	test("Activity was added to the Trip.", async () => {
		const trip = await createTrip();
		const activityProps: ActivityProps = {
			title: "Test Activity",
			createdAt: createUTCDate(),
            userId: 1
		};

		await trip.addActivity(activityProps);

		const [
			{
				props: { title, userId, tripId,  },
			},
		] = await Activity.readAll(sql, trip.props.id!);

		expect(title).toBe(activityProps.title);
		expect(userId).toBe(activityProps.userId);
		expect(tripId).toBe(activityProps.tripId);
	});

	test("Activity was removed from the Trip.", async () => {
		const trip = await createTrip();
		const activityProps: ActivityProps = {
			title: "Test Activity",
			createdAt: createUTCDate(),
            userId: 1
		};

		const activity = await trip.addActivity(activityProps);

		await activity.delete();

		const activities = await Activity.readAll(sql, trip.props.id!);

		expect(activities).toHaveLength(0);
	});

	test("Activities were listed for the Trip.", async () => {
		const trip = await createTrip();
		const activity1 = await trip.addActivity({
			title: "Activity 1",
			tripId: trip.props.id!,
			createdAt: createUTCDate(),
            userId: 1
		});
		const activity2 = await trip.addActivity({
			title: "Activity 2",
			tripId: trip.props.id!,
			createdAt: createUTCDate(),
            userId: 1
		});
		const activities = await Activity.readAll(sql, trip.props.id!);

		expect(activities).toContainEqual(activity1);
		expect(activities).toContainEqual(activity2);
	});

	test("Activity was updated successfully.", async () => {
		const trip = await createTrip();
		const activity = await trip.addActivity({
			title: "Activity",
			tripId: trip.props.id!,
			createdAt: createUTCDate(),
            userId: 1
		});

        await activity.update({
            title: "Updated Activity"
        })

        const updatedActivity = await Activity.read(sql, activity.props.id!);

		expect(updatedActivity!.props.title).toBe("Updated Activity");
	});
});

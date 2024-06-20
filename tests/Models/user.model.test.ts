import postgres from "postgres";
import { test, describe, expect, afterEach, afterAll } from "vitest";
import User, { UserProps } from "../../src/models/User";

describe("User CRUD operations", () => {
	// Set up the connection to the DB.
	const sql = postgres({
		database: "TravelooDB",
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

	const createUser = async (props: Partial<UserProps> = {}) => {
		return await User.create(sql, {
			email: props.email || "user@email.com",
			password: props.password || "password",
			username: props.username || "user",
		});
	};

	test("User was created.", async () => {
		const user = await createUser({ password: "Password123" });

		expect(user.props.email).toBe("user@email.com");
		expect(user.props.username).toBe("user");
		expect(user.props.password).toBe("Password123");
	});

	test("User was not created with duplicate email.", async () => {
		await createUser({ email: "user@email.com" });

		await expect(async () => {
			await createUser({ email: "user@email.com" });
		}).rejects.toThrow("User with this email already exists.");
	});

	test("User was not created with duplicate username.", async () => {
		await createUser({ username: "user123" });

		await expect(async () => {
			await createUser({ email: "newemail@email.com", username: "user123" });
		}).rejects.toThrow("User with this username already exists.");
	});

	test("User was logged in.", async () => {
		const user = await createUser({ password: "Password123" });
		const loggedInUser = await User.login(
			sql,
			user.props.email,
			"Password123",
		);

		expect(loggedInUser?.props.email).toBe("user@email.com");
		expect(loggedInUser?.props.password).toBe("Password123");
		expect(loggedInUser?.props.username).toBe("user");
	});

	test("User was not logged in with invalid password.", async () => {
		const user = await createUser({ password: "Password123" });

		await expect(async () => {
			await User.login(sql, user.props.email, "wrongpassword");
		}).rejects.toThrow("Invalid credentials.");
	});

	test("User was not logged in with invalid email.", async () => {
		const user = await createUser({ password: "Password123" });

		await expect(async () => {
			await User.login(sql, "invalid@email.com", "password");
		}).rejects.toThrow("Invalid credentials.");
	});

	test("User was not logged in with invalid email and password.", async () => {
		const user = await createUser({ password: "Password123" });

		await expect(async () => {
			await User.login(sql, "invalid@email.com", "wrongpassword");
		}).rejects.toThrow("Invalid credentials.");
	});

	test("Users were listed.", async () => {
		const user1 = await createUser({ username: "user1", email: "user1@email.com" });
		const user2 = await createUser({ username: "user2", email: "user2@email.com" });
		const user3 = await createUser({ username: "user3", email: "user3@email.com" });

		const users = await User.readAll(sql);

		expect(users).toHaveLength(3);
		expect(users[0].props.email).toBe(user1.props.email);
		expect(users[1].props.email).toBe(user2.props.email);
		expect(users[2].props.email).toBe(user3.props.email);
		expect(users[0].props.username).toBe(user1.props.username);
		expect(users[1].props.username).toBe(user2.props.username);
		expect(users[2].props.username).toBe(user3.props.username);
	});

	test("User was deleted.", async () => {
		const user = await createUser({ password: "Password123" });
		const result = await user.delete();

		expect(result).toBe(true);

		const deletedUser = await User.read(sql, user.props.id!);

		expect(deletedUser).toBeNull();
	});

	test("User was read.", async () => {
		const user = await createUser({ password: "Password123" });
		const readUser = await User.read(sql, user.props.id!);

		expect(readUser?.props.email).toBe("user@email.com");
		expect(readUser?.props.username).toBe("user");
		expect(readUser?.props.password).toBe("Password123");
	});

	test("User was updated.", async () => {
		const user = await createUser({ password: "Password123" });
		const oldPassword = user.props.password;

		await user.update({
			email: "updated@email.com",
			username: "newusername",
			password: "newpassword",
		});

		expect(user.props.email).toBe("updated@email.com");
		expect(user.props.username).toBe("newusername");
		expect(user.props.password).toBe("newpassword");
		expect(user.props.password).not.toBe(oldPassword);
	});

	test("User was not updated with duplicate email.", async () => {
		const user1 = await createUser({ username: "user1", email: "user1@email.com" });
		const user2 = await createUser({ username: "user2", email: "user2@email.com" });

		await expect(async () => {
			await user2.update({ email: "user1@email.com" });
		}).rejects.toThrow("User with this email already exists.");

		expect(user2.props.email).not.toBe(user1.props.email);
	});

	test("User was not updated with duplicate username.", async () => {
		const user1 = await createUser({ email: "user1@email.com", username: "user1" });
		const user2 = await createUser({ email: "user22@email.com", username: "user2" });

		await expect(async () => {
			await user2.update({ username: "user1" });
		}).rejects.toThrow("User with this username already exists.");

		expect(user2.props.username).not.toBe(user1.props.username);
	});

	test("User was updated with profile picture.", async () => {
		const user = await createUser();
		const profile = "https://picsum.photos/id/238/100";

		await user.update({ profilePicture: profile });

		expect(user.props.profilePicture).toBe(profile);
	});
});
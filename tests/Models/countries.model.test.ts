import postgres from "postgres";
import Trip, { TripProps } from "../../src/models/Trip";
import { test, describe, expect, afterEach, beforeEach, afterAll } from "vitest";
import { createUTCDate } from "../../src/utils";
import Country, {CountryProps} from "../../src/models/Countries";
import User, { UserProps } from "../../src/models/User";

describe("Country READ operations", () => {
	// Set up the connection to the DB.
	const sql = postgres({
		database: "TravelooDB",
	});

    const createAllCountries =  async () => {
        return await Country.readAll(sql);
    }

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
	});

	test("Countries were read by id searching (Afghanistan).", async () => {
		const country = await Country.read(sql, 1);

        console.log(country);

		// Check if the name and ISO of the country are as expected.
		expect(country?.props.name).toBe("Afghanistan");
		expect(country?.props.iso).toBe("AF");
	});

	test("Countries was readALL.", async () => {

        const country1 = await Country.read(sql, 13);  // {id: 13, name: "Australia", iso: "AU"};
		const country2 = await Country.read(sql, 5);   // {id: 5, name: "Andorra", iso: "AD"};
		const country3 = await Country.read(sql, 15);  //{id: 15, name: "Azerbaijan", iso: "Az"};

		const listCountries = await createAllCountries();

        expect(listCountries).toBeInstanceOf(Array);
        expect(listCountries).toContainEqual(country1);
		expect(listCountries).toContainEqual(country2);
		expect(listCountries).toContainEqual(country3);
        
	});

	test("Country was find by name.", async () => {
        // Example Albania
        const country = await Country.findByName(sql, "Albania")
		expect(country?.props.id).toBe(2);
		expect(country?.props.iso).toBe("AL");
	});

    test("Country was find by ISO.", async () => {
        // Example BE
        const country = await Country.findByISO(sql, "BE")
		expect(country?.props.id).toBe(21);
		expect(country?.props.name).toBe("Belgium");
	});

});

import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import User from "../models/User";
import Cookie from "../auth/Cookie";
import SessionManager from "../auth/SessionManager";
import Trip, { TripProps } from "../models/Trip";
import { format } from 'date-fns';

/**
 * Controller for handling Trip CRUD operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class TripController {
	private sql: postgres.Sql<any>;

	constructor(sql: postgres.Sql<any>) {
		this.sql = sql;
	}

	/**
	 * To register a route, call the corresponding method on
	 * the router instance based on the HTTP method of the route.
	 *
	 * @param router Router instance to register routes on.
	 *
	 * @example router.get("/trips", this.getAllTrips);
	 */
	registerRoutes(router: Router) {
		router.get("/trips", this.getAllTrips);
		router.get("/trips/new", this.getNewTripForm);
		router.post("/trips", this.createTrip);
		router.post("/trips/:id/users", this.addUser);
		router.get("/trips/:id", this.getTrip);
		router.get("/trips/:id/edit", this.getEditTripForm);
		router.put("/trips/:id", this.updateTrip);
		router.put("/trips/:id/update-status", this.updateStatus);
		router.delete("/trips/:id", this.deleteTrip);
		router.delete("/trips/:id/users/:id", this.removeUser);
	}

	// Method to get the form for creating a new trip
	getNewTripForm = async (req: Request, res: Response) => {
		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value &&
			req.getSession().data.userId;

		let session = req.getSession();
		res.setCookie(session.cookie);

		if (!isSession) {
			return await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: `/login`,
			});
		} 
		await res.send({
			statusCode: StatusCode.OK,
			message: "New trip form",
			template: "NewTripFormView",
			payload: { 
				title: "New Trip",
				isSession,
			},
		});
	};

	// Method to get the form for editing a trip
	getEditTripForm = async (req: Request, res: Response) => {
		const id = req.getId();
		const userId = req.body.userId || 0;

		let trip: Trip | null = null;
		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value &&
			req.getSession().data.userId;

		let session = req.getSession();
		res.setCookie(session.cookie);

		if (!isSession) {
			return await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: `/login`,
			});
		} 
		
		try {
			trip = await Trip.read(this.sql, id);
		} catch (error) {
			const message = `Error while getting trip list: ${error}`;
			console.error(message);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Edit trip form",
			template: "EditTripFormView",
			payload: { 
				trip: trip?.props, 
				title: "Edit Trip",
				isSession,
			},
		});
	};

	// Method to get all trips for a user
	getAllTrips = async (req: Request, res: Response) => {
		const userId = req.session.data.userId;
		const isSession = req.getSession().cookie.name === 'session_id' && req.getSession().cookie.value;
	
		// Check if the user is authenticated
		if (!isSession || !userId) {
			return res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: `/login`,
			});
		}
	
		let trips: Trip[] = [];
	
		try {
			trips = await Trip.readAll(this.sql, userId);
		} catch (error) {
			const message = `Error while getting trip list: ${error}`;
			console.error(message);
			return res.send({
				statusCode: StatusCode.InternalServerError,
				message: "Internal Server Error",
			});
		}
	
		const tripList = trips.map((trip) => {
			return {
				...trip.props,
				isComplete: trip.props.status === "complete",
			};
		});
	
		await res.send({
			statusCode: StatusCode.OK,
			message: "Trip list retrieved",
			payload: {
				title: "Trip List",
				trips: tripList,
				isSession,
				id: { id: userId },
			},
			template: "ListAllTrips",
		});
	};
	
	// Method to get a specific trip by its ID
	getTrip = async (req: Request, res: Response) => {
		const id = req.getId();

		let trip: Trip | null = null;

		if(isNaN(id)){
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid ID",
			});
		}
		const userId = req.body.userId || 0;

		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value;

		let session = req.getSession();
		res.setCookie(session.cookie);
		let formattedStartDate = null;
		let formattedEndDate = null;

		try {
			trip = await Trip.read(this.sql, id);
			if(!trip){
				return await res.send({
					statusCode: StatusCode.NotFound,
					message: "Not found",
					payload: {error: "Not Found"},
					template: "ErrorView",
				});
			}

			if (!isSession || !req.getSession().data.userId) {
				return await res.send({
					statusCode: StatusCode.Unauthorized,
					message: "Unauthorized",
					redirect: `/login`,
				});
			}

			if(!trip?.props.users.includes(session.data.userId)){
				res.send({
					statusCode: StatusCode.Forbidden,
					message: "Forbidden",
					template: "ErrorView",
					payload: {error: "Forbidden"}
				})
				return;
			}
			// Ensure the dates are properly converted and formatted
			const startDate = new Date(trip.props.startDate);
			const endDate = new Date(trip.props.endDate);

			if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
				throw new Error("Invalid date format");
			}

			formattedStartDate = format(startDate, 'EEEE MMMM dd yyyy');
			formattedEndDate = format(endDate, 'EEEE MMMM dd yyyy');
		} catch (error) {
			const message = `Error while getting trip: ${error}`;
			console.error(message);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Trip retrieved",
			template: "ShowTripView",
			payload: {
				trip: trip?.props,
				title: trip?.props.title,
				formattedStartDate,
				formattedEndDate,
				isComplete: trip?.props.status === "complete",
				isSession,
			},
		});
	};

	// Method to create a new trip
	createTrip = async (req: Request, res: Response) => {
		let trip: Trip | null = null;

		let session = req.getSession();
		res.setCookie(session.cookie);

		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value &&
			req.getSession().data.userId;

		if (!session.data.userId) {
			return await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: `/login`,
			});
		} 

		let tripProps: TripProps = {
			title: req.body.title,
			description: req.body.description,
			status: req.body.status || "planning",
			startDate: req.body.startDate,
			endDate: req.body.endDate,
			countryId: req.body.countryId,
			users: req.body.users || [session.data.userId],
		};

		if (!tripProps.title || !tripProps.description || !tripProps.countryId) {
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Request body must include all required fields.",
				payload: {
					tripProps,
					error: "Request body must include all required fields.",
				},
				template: "ErrorView"
			});
		}
	
		try {
			trip = await Trip.create(this.sql, tripProps);
			await res.send({
				statusCode: StatusCode.Created,
				message: "Trip created successfully!",
				payload: { 
					trip: trip.props,
					isSession,
				},
				redirect: `/trips/${trip.props.id}`,
			});
		} catch (error) {
			console.error("Error while creating trip:", error);
		}
	};
	
	// Method to update a specific trip by its ID
	updateTrip = async (req: Request, res: Response) => {
		const id = req.getId();
		const userId = req.session.data.userId;

		const tripProps: Partial<TripProps> = {};

		if (req.body.title) {
			tripProps.title = req.body.title;
		}

		if (req.body.description) {
			tripProps.description = req.body.description;
		}

		if (req.body.status){
			tripProps.status = req.body.status;
		}

		if (req.body.startDate){
			tripProps.startDate = req.body.startDate;
		}

		if (req.body.endDate){
			tripProps.endDate = req.body.endDate;
		}

		let trip: Trip | null = null;

		if(isNaN(id)){
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid ID",
				redirect:`/login`
			});
		}

		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value;

		let session = req.getSession();
		res.setCookie(session.cookie);

		try {
			trip = await Trip.read(this.sql, id);
			if(!trip){
				return await res.send({
					statusCode: StatusCode.NotFound,
					message: "Not found",
					payload: {error: "Not found",},
					template: "ErrorView",
				});
			}

			if (!isSession || !req.getSession().data.userId || !userId) {
				return await res.send({
					statusCode: StatusCode.Unauthorized,
					message: "Unauthorized",
					redirect: `/login`
				});
			}
			
			if(!trip?.props.users.includes(session.data.userId)){
				res.send({
					statusCode: StatusCode.Forbidden,
					message: "Forbidden",
					template: "ErrorView",
					payload: {error: "Forbidden"}
				})
				return;
			}
		} catch (error) {
			console.error("Error while reading trip:", error);
		}

		try {
			await trip?.update(tripProps);
		} catch (error) {
			console.error("Error while updating trip:", error);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Trip updated successfully!",
			payload: { 
				trip: trip?.props,
				isSession,
			},
			redirect: `/trips/${id}`,
		});
	};

	// Method to delete a specific trip by its ID
	deleteTrip = async (req: Request, res: Response) => {
		const id = req.getId();
		const userId = req.body.userId || 0;

		let trip: Trip | null = null;

		if(isNaN(id)){
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid ID",
			});
		}

		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value;

		let session = req.getSession();
		res.setCookie(session.cookie);

		try {
			trip = await Trip.read(this.sql, id);
			if(!trip){
				return await res.send({
					statusCode: StatusCode.NotFound,
					message: "Not found",
					payload: {error: "Not found",},
					template: "ErrorView",
				});
			}

			if (!isSession || !req.getSession().data.userId) {
				return await res.send({
					statusCode: StatusCode.Unauthorized,
					message: "Unauthorized",
					payload: {error: "Unauthorized",},
					template: "ErrorView",
				});
			}
			
			if(!trip?.props.users.includes(session.data.userId)){
				res.send({
					statusCode: StatusCode.Forbidden,
					message: "Forbidden",
					template: "ErrorView",
					payload: {error: "Forbidden"}
				})
				return;
			}

		} catch (error) {
			console.error("Error while deleting trip:", error);
		}

		try {
			await trip?.delete();
		} catch (error) {
			console.error("Error while deleting trip:", error);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Trip deleted successfully!",
			payload: { 
				trip: trip?.props, 
				isSession, 
			},
			redirect: "/trips",
		});
	};

	// Method to update the status of a specific trip
	updateStatus = async (req: Request, res: Response) => {
		const id = req.getId();
		let trip: Trip | null = null;
		let session = req.getSession();
		res.setCookie(session.cookie);
		let status = req.body.status;

		if(!session.data.userId){
			res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: "/login"
			})
			return;
		}

		if(isNaN(id)){
			res.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid ID",
				template: "ErrorView",
				payload: {error: "Forbidden"}
			})
			return;
		}

		try {
			trip = await Trip.read(this.sql, id);
		} catch (error) {
			console.error("Error while updating trip status.", error);
		}

		try {
			await trip?.updateStatus(status);
		} catch (error) {
			console.error("Error while updating trip status.", error);
		}

		if(trip?.props.id === undefined){
			res.send({
				statusCode: StatusCode.NotFound,
				message: "Not found",
				template: "ErrorView",
				payload: {error: "Not found"}
			})
			return;
		}
		else if(!trip?.props.users.includes(session.data.userId)){
			res.send({
				statusCode: StatusCode.Forbidden,
				message: "Forbidden",
				template: "ErrorView",
				payload: {error: "Forbidden"}
			})
			return;
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Trip status updated!",
			payload: { trip: trip?.props },
			redirect: `/trips/${id}`,
		});
	};

	// Method to add a user to a trip
	addUser = async (req: Request, res: Response) => {
		const id = req.getId();
		let trip: Trip | null = null;
		let user: User | null = null;
		let email = req.body.email;
		let session = req.getSession();
		res.setCookie(session.cookie);

		if(!session.data.userId){
			res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: "/login"
			})
			return;
		}

		if(isNaN(id)){
			res.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid ID",
				template: "ErrorView",
				payload: {error: "Forbidden"}
			})
			return;
		}

		try{
			user = await User.findByEmail(this.sql, email);
			trip = await Trip.read(this.sql, id);
			await trip?.addUser(user?.props.id!);
		}
		catch(error){
			console.error("Error while adding user to trip.", error);
		}
		
		await res.send({
			statusCode: StatusCode.OK,
			message: "User added to the Trip!",
			payload: { trip: trip?.props },
			redirect: `/trips/${id}`,
		});
	}

	// Method to remove a user from a trip
	removeUser = async (req: Request, res: Response) => {
		const id = req.getId();
		const userId = req.getSecondId();
		let trip: Trip | null = null;
		let user: User | null = null;
		let session = req.getSession();
		res.setCookie(session.cookie);

		if(!session.data.userId){
			res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: "/login"
			})
			return;
		}

		if(isNaN(id)){
			res.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid ID",
				template: "ErrorView",
				payload: {error: "Forbidden"}
			})
			return;
		}

		try{
			trip = await Trip.read(this.sql, id);
			await trip?.removeUser(userId);
		}
		catch(error){
			console.error("Error while removing user from trip.", error);
		}
		
		await res.send({
			statusCode: StatusCode.OK,
			message: "User removed from the Trip!",
			payload: { trip: trip?.props },
			redirect: `/trips/${id}`,
		});
	}
}

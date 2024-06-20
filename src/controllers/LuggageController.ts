import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import User from "../models/User";
import Cookie from "../auth/Cookie";
import SessionManager from "../auth/SessionManager";
import Luggage, { LuggageProps } from "../models/Luggage";
import Trip from "../models/Trip";
/**
 * Controller for handling Luggage "CRUD" operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class LuggageController {
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
	 * @example router.get("/trips/:id/luggage", this.getLuggageItems);
	 */
	registerRoutes(router: Router) {
		router.get("/trips/:id/luggage", this.getLuggageItems);
		router.get("/trips/:id/luggage/:id", this.getLuggage);
		router.post("/trips/:id/luggage", this.addItemToLuggage);
		router.delete("/trips/:id/luggage/:itemId", this.deleteLuggageItem);
	}

	// Method to get a specific luggage item by its ID
	getLuggage = async (req: Request, res: Response) => {
		const id = req.getId();

		let luggage: Luggage | null = null;

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
			luggage = await Luggage.read(this.sql, id);
			if(!luggage){
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

			if(req.getSession().data.userId != luggage.props.userId){
				return await res.send({
					statusCode: StatusCode.Forbidden,
					message: "Forbidden",
					payload: {error: "Forbidden"},
					template: "ErrorView",
				});
			}

			
		} catch (error) {
			const message = `Error while getting lugagge: ${error}`;
			console.error(message);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Luggage retrieved",
			template: "ShowLuggageView",
			payload: {
				luggage: luggage?.props,
				isSession,
			},
		});
	};
	
	// Method to get all luggage items for a specific trip
	getLuggageItems = async (req: Request, res: Response) => {
		try{
            const id: number = req.getId();

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

            if(isNaN(id)){
                await res.send({
                    statusCode: StatusCode.BadRequest,
                    message: "Invalid Id."
                });
            }
			else{
				let trip = await Trip.read(this.sql, id);
            
				if(trip === null){
					await res.send({
                        statusCode: StatusCode.NotFound,
                        message: "Not found."
                    });
				}
				else{
					let luggageList = await Luggage.readAll(this.sql, id);
					let propsList = luggageList.map((x) => x.props);
					await res.send({
                        statusCode: StatusCode.OK,
                        message: "Luggage list retrieved",
						template: "ListAllLuggageView",
                        payload: {
							luggages: propsList,
							tripId: id,
							isSession,
						}
                    });
				}
			}
		}
		catch{
			await res.send({
                statusCode: StatusCode.InternalServerError,
                message: "Error accessing database."
            });
		}
	};

	// Method to add a new item to the luggage
	addItemToLuggage = async (req: Request, res: Response) => {
		let luggage: Luggage | null = null;
		let id = req.getId();

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
		let luggageProps: LuggageProps = {
			name: req.body.name,
            amount: req.body.amount,
            type: req.body.type,
            userId: session.data.userId,
		};

		if (!req.body.name || req.body.amount === undefined || !req.body.type) {
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Request body must include all required fields.",
				payload: {
					luggageProps,
					error: "Request body must include all required fields.",
				},
				template: "ErrorView"
			});
		}
		const tripId = req.body.tripId || 0;
		
		try {
			let trip = await Trip.read(this.sql, id);
			luggage = await trip!.addLuggage(luggageProps);		// req.getSession().data.userId
			await res.send({
				statusCode: StatusCode.Created,
				message: "Luggage created successfully!",
				payload: { 
					luggage: luggage.props,
					isSession,
				},
				redirect: `/trips/${id}/luggage`,
			});
		} catch (error) {
			console.error("Error while creating budget:", error);
		}
	};
	
	// Method to delete a specific luggage item by its ID
	deleteLuggageItem = async (req: Request, res: Response) => {
		try{
			const id = req.getId();
			const budgetId = req.getSecondId();
			if (isNaN(id)) {
				await res.send({
                    statusCode: StatusCode.BadRequest,
                    message: "Invalid ID."
                });
			}
			else if(isNaN(budgetId)){
				await res.send({
                    statusCode: StatusCode.BadRequest,
                    message: "Invalid Activity ID."
                });
			}
			else {
				let luggage = await Luggage.read(this.sql, budgetId)
				await luggage?.delete();
				await res.send({
					statusCode: StatusCode.OK,
					message: "Luggage deleted successfully!",
					redirect: `/trips/${id}/luggage`
				});
			}
		}
		catch{
			await res.send({
                statusCode: StatusCode.InternalServerError,
                message: "Error accessing database."
            });
		}
	}
}

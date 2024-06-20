import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import User from "../models/User";
import Cookie from "../auth/Cookie";
import SessionManager from "../auth/SessionManager";
import Activity, { ActivityProps } from "../models/Activity";
import { createUTCDate } from "../utils";
import Trip from "../models/Trip";
/**
 * Controller for handling Activity "CRUD" operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class ActivityController {
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
	 * @example router.get("/trips/:id/activities", this.getAllActivities);
	 */
	registerRoutes(router: Router) {
		router.get("/trips/:id/activities", this.getAllActivities);
		router.get("/trips/:id/activities/:id", this.getActivity);
		router.post("/trips/:id/activities", this.addActivityToTrip);
		router.put("/trips/:id/activities/:id", this.updateActivity);
		router.delete("/trips/:id/activities/:id", this.deleteActivity);
	}

	// Method to get a specific activity by its ID
	getActivity = async (req: Request, res: Response) => {
		const id = req.getId();

		let activity: Activity | null = null;

		if(isNaN(id)){
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid ID",
			});
		}

		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value;


		try {
			activity = await Activity.read(this.sql, id);
			if(!activity){
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

			if(req.getSession().data.userId != activity.props.userId){
				return await res.send({
					statusCode: StatusCode.Forbidden,
					message: "Forbidden",
					payload: {error: "Forbidden"},
					template: "ErrorView",
				});
			}
		} catch (error) {
			const message = `Error while getting activity: ${error}`;
			console.error(message);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Activity retrieved",
			template: "ShowActivityView",
			payload: {
				activity: activity?.props,
				title: activity?.props.title,
				createdAt: activity?.props.createdAt,
    			editedAt: activity?.props.editedAt,
				isSession,
			},
		});
	};

	// Method to add an activity to a trip
	addActivityToTrip = async (req: Request, res: Response) => {
		const id = req.getId();

		if(isNaN(id)){
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid ID",
			});
		}

		let session = req.getSession();
		res.setCookie(session.cookie);

		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value &&
			req.getSession().data.userId;

		if (!isSession || !req.getSession().data.userId) {
			return await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: `/login`,
			});
		} 

		let activityProps: ActivityProps = {
			title: req.body.title,
			createdAt: createUTCDate(),
			userId: session.data.userId,
			tripId: id,
		};

		if (!activityProps.title || !activityProps.tripId) {
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Request body must include title.",
				payload: {
					activityProps,
					error: "Request body must include title.",
				},
				template: "ErrorView"
			});
		}
	
		try {
			let trip = await Trip.read(this.sql, id);
			let activity = await trip?.addActivity(activityProps);
			await res.send({
				statusCode: StatusCode.Created,
				message: "Activity created successfully!",
				payload: { 
					activity: activity!.props,
					isSession,
				},
				redirect: `/trips/${id}/activities`,
			});
		} catch (error) {
			console.error("Error while creating activity:", error);
		}
	}

	// Method to get all activities for a specific trip
	getAllActivities = async (req: Request, res: Response) => {
		try{
			let session = req.getSession();
			res.setCookie(session.cookie);
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
					let activityList = await Activity.readAll(this.sql, id);
					let propsList = activityList.map((x) => x.props);
					await res.send({
                        statusCode: StatusCode.OK,
                        message: "Activity list retrieved",
						template: "ListAllActivitiesView",
                        payload: {
							activities: propsList,
							tripId: id,
							isSession,
						},
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
	}

	// Method to update a specific activity
	updateActivity = async (req: Request, res: Response) => {
		try{
			const id = req.getId();
			const activityId = req.getSecondId();

			if (req.body === undefined) {
				await res.send({
                    statusCode: StatusCode.BadRequest,
                    message: "Invalid request"
                });
			} 
			else if (isNaN(id)) {
				await res.send({
                    statusCode: StatusCode.BadRequest,
                    message: "Invalid Trip ID."
                });
			} 
			else if(isNaN(activityId)){
				await res.send({
                    statusCode: StatusCode.BadRequest,
                    message: "Invalid Activity ID."
                });
			}
			else {
				let activity = await Activity.read(this.sql, activityId);
				if(activity === null){
					await res.send({
                        statusCode: StatusCode.NotFound,
                        message: "Activity not found."
                    });
				}
				else{
					await activity.update(req.body);
					await res.send({
                        statusCode: StatusCode.OK,
                        message: "Activity updated successfully!",
                        payload: {
							activity: activity.props
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
	}

	// Method to delete a specific activity
	deleteActivity = async (req: Request, res: Response) => {
		try{
			const id = req.getId();
			const activityId = req.getSecondId();
			if (isNaN(id)) {
				await res.send({
                    statusCode: StatusCode.BadRequest,
                    message: "Invalid ID."
                });
			}
			else if(isNaN(activityId)){
				await res.send({
                    statusCode: StatusCode.BadRequest,
                    message: "Invalid Activity ID."
                });
			}
			else {
				let activity = await Activity.read(this.sql, activityId)
				await activity?.delete();
				await res.send({
					statusCode: StatusCode.OK,
					message: "Activity deleted successfully!",
					redirect: `/trips/${id}/activities`
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

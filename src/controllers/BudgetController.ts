import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import User from "../models/User";
import Cookie from "../auth/Cookie";
import SessionManager from "../auth/SessionManager";
import Budget, { BudgetProps } from "../models/Budget";
import Trip from "../models/Trip";
/**
 * Controller for handling Budget "CRUD" operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class BudgetController {
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
	 * @example router.get("/trips/:id/budget", this.getAllBudgets);
	 */
	registerRoutes(router: Router) {
		router.get("/trips/:id/budget", this.getAllBudgets);
		router.get("/trips/:id/budget/:id", this.getBudget);
		router.post("/trips/:id/budget", this.addBudget);
		router.delete("/trips/:id/budget/:id", this.deleteBudget);
		router.get("/trips/:id/budget/new", this.getNewBudgetForm);
	}

	// Method to get a specific budget by its ID
	getBudget = async (req: Request, res: Response) => {
		const id = req.getId();
		const budgetId = req.getSecondId();

		let budget: Budget | null = null;

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
			budget = await Budget.read(this.sql, budgetId);
			if(!budget){
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

			if(req.getSession().data.userId != budget.props.userId){
				return await res.send({
					statusCode: StatusCode.Forbidden,
					message: "Forbidden",
					payload: {error: "Forbidden"},
					template: "ErrorView",
				});
			}

			
		} catch (error) {
			const message = `Error while getting budget: ${error}`;
			console.error(message);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Budget retrieved",
			template: "ShowBudgetView",
			payload: {
				budget: budget?.props,
				title: budget?.props.title,
				isSession,
			},
		});
	};

	// Method to add a new budget
	addBudget = async (req: Request, res: Response) => {
		let budget: Budget | null = null;
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
		let budgetProps: BudgetProps = {
			title: req.body.title,
			spendingLimit: req.body.spendingLimit,
			amountSpent: req.body.amountSpent,
			userId: session.data.userId,
			tripId: id,
		};

		if (!req.body.title || !req.body.spendingLimit || req.body.amountSpent === undefined) {
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Request body must include title, limit and amount spent.",
				payload: {
					budgetProps,
					error: "Request body must include title, limit and amount spent.",
				},
				template: "ErrorView"
			});
		}
		const tripId = req.body.tripId || 0;
		
		try {
			let trip = await Trip.read(this.sql, id);
			budget = await trip!.addBudget(budgetProps);
			await res.send({
				statusCode: StatusCode.Created,
				message: "Budget created successfully!",
				payload: { 
					budget: budget.props,
					isSession,
				},
				redirect: `/trips/${id}/budget`,
			});
		} catch (error) {
			console.error("Error while creating budget:", error);
		}
	};

	// Method to get the form for creating a new budget
	getNewBudgetForm = async (req: Request, res: Response) => {
		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value &&
			req.getSession().data.userId;

		if (!isSession) {
			return await res.send({
				statusCode: StatusCode.Unauthorized,
				message: "Unauthorized",
				redirect: `/login`,
			});
		} 
		await res.send({
			statusCode: StatusCode.OK,
			message: "New budget form",
			template: "NewBudgetFormView",
			payload: { 
				title: "New Budget",
				isSession,
			},
		});
	};

	// Method to get all budgets for a specific trip
	getAllBudgets = async (req: Request, res: Response) => {
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
					let budgetList = await Budget.readAll(this.sql, id);
					let propsList = budgetList.map((x) => x.props);
					await res.send({
                        statusCode: StatusCode.OK,
                        message: "Budget list retrieved",
						template: "ListAllBudgetView",
                        payload: {
							budgets: propsList,
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
	}

	// Method to delete a specific budget by its ID
	deleteBudget = async (req: Request, res: Response) => {
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
				let budget = await Budget.read(this.sql, budgetId)
				await budget?.delete();
				await res.send({
					statusCode: StatusCode.OK,
					message: "Budget deleted successfully!",
					redirect: `/trips/${id}/budget`
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



	
	
import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import User, { DuplicateEmailError, DuplicateUsernameError, UserProps } from "../models/User";
import Cookie from "../auth/Cookie";
import SessionManager from "../auth/SessionManager";
import { createUTCDate } from "../utils";

/**
 * Controller for handling User CRUD operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class UserController {
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
	 * @example router.get("/users/:id", this.getUser);
	 */
	registerRoutes(router: Router) {
		router.post("/users", this.createUser);
		router.get("/users/:id", this.getUser);
		router.get("/users/:id/edit", this.getUpdateUserForm);
		router.post("/users/:id/edit", this.updateUser);
	}

	// Method to get the form for updating a user
	getUpdateUserForm = async (req: Request, res: Response) => {
		let id = req.getSession().data.userId;

		
		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value &&
			id;

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
			message: "User Profile",
			template: "UserProfile",
			payload: { 
				title: "User Profile", 
				id, 
				isSession,
			},
		});
	}

	// Method to create a new user
	createUser = async (req: Request, res: Response) => {
		let session = req.getSession();
		res.setCookie(session.cookie);
		const { email, password, confirmPassword, username } = req.body;
	
		if (!email) {
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Missing email.",
				template: "RegistrationFormView",
				payload: { errorMessage: "Email is required." },
			});
		}

		if(!username){
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Missing username.",
				template: "RegistrationFormView",
				payload: { errorMessage: "Username is required." },
			});
		}
	
		if (!password) {
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Missing password.",
				template: "RegistrationFormView",
				payload: { errorMessage: "Password is required." },
			});
		}
	
		if (password !== confirmPassword) {
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Passwords do not match",
				template: "RegistrationFormView",
				payload: { errorMessage: "Passwords do not match." },
			});
		}
	
		const existingUser = await User.findByEmail(this.sql, email);
		if (existingUser) {
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "User with this email already exists.",
				template: "RegistrationFormView",
				payload: { errorMessage: DuplicateEmailError },
			});
		}
	
		const userProps: UserProps = {
			email: email,
			password: password,
			username: username,
		};
	
		let user: User | null = null;
		try {
			user = await User.create(this.sql, userProps);
			await res.send({
				statusCode: StatusCode.Created,
				message: "User created",
				payload: { 
					user: user.props,
				},
				redirect: `/login`,
			});
		} catch (error) {
			if(error instanceof DuplicateUsernameError){
				await res.send({
					statusCode: StatusCode.BadRequest,
					message: "User with this username already exists.",
					template: "RegistrationFormView",
					payload: { errorMessage: DuplicateUsernameError },
				})
			}
			else{
				console.error("Error while creating user:", error);
				await res.send({
					statusCode: StatusCode.InternalServerError,
					message: "Server error",
					payload: { errorMessage: "Server error occurred." },
					redirect: `/register?error=server_error`,
				});
			}
		}
	};

	// Method to get a specific user by their ID
	getUser = async (req: Request, res: Response) =>{
		const id = req.getId();
		let user: User | null = null;
		const sessionId = req.findCookie('session_id');

		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value &&
			id;

		let session = req.getSession();
		res.setCookie(session.cookie);

		try {
			user = await User.read(this.sql, id);
			if(!user){
				await res.send({
					statusCode: StatusCode.NotFound,
					message: "User not found",
					template: "UserProfile",
					payload: {
						sessionId: sessionId,
					},
				});
			}
		} catch (error) {
			const message = `Error while getting trip list: ${error}`;
			console.error(message);
		}
		await res.send({
			statusCode: StatusCode.OK,
			message: "User found",
			template: "UserProfile",
			payload: {
				user: user?.props,
				sessionId: sessionId,
				isSession,
			},
		});
	}

	// Method to update a specific user by their ID
	updateUser = async (req: Request, res: Response) => {
		const id = req.getId();
		const userId = req.body.userId || 0;
		const userProps: Partial<UserProps> = req.body; 

		let user: User | null = null;

		let session = req.getSession();
		res.setCookie(session.cookie);

		if(isNaN(id)){
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid user ID",
				redirect:`/login`
			});
		}

		
		const isSession = req.getSession().cookie.name == 'session_id' && 
			req.getSession().cookie.value;

		try {
			user = await User.read(this.sql, id);
			
			if (!isSession || !req.getSession().data.userId) {
				return await res.send({
					statusCode: StatusCode.Unauthorized,
					message: "Unauthorized",
					redirect: `/login`
				});
			}
		} catch (error) {
			console.error("Error while updating user:", error);
		}

		const resultUser = await User.findByEmail(this.sql, req.body.email);
		if (resultUser?.props.email == req.body.email && user?.props.email != req.body.email) {
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "User with this email already exists.",
				payload: {error: "User with this email already exists.",},
			});
		}

		const resultUser2 = await User.findByUsername(this.sql, req.body.username);
		if (resultUser2?.props.username == req.body.username && user?.props.username != req.body.username) {
			return await res.send({
				statusCode: StatusCode.BadRequest,
				message: "User with this username already exists.",
				payload: {error: "User with this username already exists.",},
			});
		}

		try {
			await user?.update(userProps);
		} catch (error) {
			console.error("Error while updating user:", error);
		}
		
		return res.send({
			statusCode: StatusCode.OK,
			message: "User updated",
			payload: { user: user?.props, 
				message: "User updated successfully!", 
				id: userId, 
				profilePicture: user?.props.profilePicture,
				isSession,
			},
			template: "UserProfile",
		});
	}
}
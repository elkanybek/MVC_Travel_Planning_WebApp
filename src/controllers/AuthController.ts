import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import User from "../models/User";
import Cookie from "../auth/Cookie";
import SessionManager from "../auth/SessionManager";
/**
 * Controller for handling Auth operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class AuthController {
	private sql: postgres.Sql<any>;

	constructor(sql: postgres.Sql<any>) {
		this.sql = sql;
	}

	registerRoutes(router: Router) {
		router.get("/register", this.getRegistrationForm);
		router.get("/login", this.getLoginForm);
		router.post("/login", this.login);
		router.get("/logout", this.logout);
	}

	// Method to get the registration form
	getRegistrationForm = async (req: Request, res: Response) => {
		const error = req.getSearchParams().get("error");
        if (error) {
            await res.send({
                statusCode: StatusCode.BadRequest,
                message: "Registration Form",
                template: "RegistrationFormView",
                payload: { error },
            });
        } else {
            await res.send({
                statusCode: StatusCode.OK,
                message: "Registration Form",
                template: "RegistrationFormView",
            });
        }
	};

	// Method to get the login form
	getLoginForm = async (req: Request, res: Response) => {
		const error = req.getSearchParams().get("error");
		if (error){
			await res.send({
				statusCode: StatusCode.OK,
				message: "Login Form",
				template: "LoginFormView",
				payload: { error },
			});
		}
		else{
			await res.send({
				statusCode: StatusCode.OK,
				message: "Login Form",
				template: "LoginFormView",
			});
		}
	};

	// Method to handle user login
	login = async (req: Request, res: Response) => {
		try {
			let { email, password, remember } = req.body;
			
			let error;
			if(!email){
				error = "Email is required.";
				return await res.send({
					statusCode: StatusCode.BadRequest,
					message: "Email is required.",
					template: "LoginFormView",
					payload: {error},
				});
			}

			if(!password){
				error = "Password is required.";
				return await res.send({
					statusCode: StatusCode.BadRequest,
					message: "Password is required.",
					template: "LoginFormView",
					payload: {error},
				});
			}

	
			const user = await User.findByEmail(this.sql, email);
			if (!user || user.props.password !== password) {
				error = "Invalid credentials.";
				return await res.send({
					statusCode: StatusCode.BadRequest,
					message: "Invalid credentials.",
					template: "LoginFormView",
					payload: {error},
				});
			}

			let session = req.getSession();
			session.data.userId = user.props.id
			res.setCookie(session.cookie);

			if(remember == 'on'){
				remember = true;
			}
			else{
				remember = false;
			}

			if(remember){
				res.setCookie(new Cookie("email", email));
			}

			return await res.send({
				statusCode: StatusCode.OK,
				message: "Logged in successfully!",
				payload: {
					user: user.props,
				},
				redirect: `/trips`
			});

		} catch (errorMessage) {
			console.error("Error while logging in:", errorMessage);
			let error ="Internal server error";
			return await res.send({
				statusCode: StatusCode.InternalServerError,
				message: error,
				template: "ErrorView",
			});
		}
	};
	
	// Method to handle user logout
	logout = async (req: Request, res: Response) => {
		req.session.destroy();
		SessionManager.getInstance().cleanUpSessions();
	
		return await res.send({
			statusCode: StatusCode.Redirect,
			message: "Logout successful",
			redirect: `/`,
		});
	};
}

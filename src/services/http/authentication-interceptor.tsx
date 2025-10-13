import { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import UserService from "../user-service";

export default function AuthenticationInterceptor(axios: AxiosInstance) {
	axios.interceptors.response.use(
		(response: AxiosResponse) => {
			return response;
		},
		(error: AxiosError) => {
			if (error === undefined || error.response === undefined) return Promise.reject(error);
			console.log(error.response.status, error.message);
			if (UserService.isLoggedIn()) {
				if (error.response.status === 401) {
					UserService.UpdateSession(null);
				} else if (error.response.status === 403) {
					UserService.UpdateSession(null);
				}
			}
			return Promise.reject(error);
		}
	);
}

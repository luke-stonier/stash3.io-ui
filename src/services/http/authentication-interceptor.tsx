import { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import UserService from "../user-service";


export default function AuthenticationInterceptor(axios: AxiosInstance) {
	axios.interceptors.response.use(
		(response: AxiosResponse) => {
			return response;
		},
		(error: AxiosError) => {
			if (error === undefined || error.response === undefined) return Promise.reject(error);
			if (error.response.status === 401) {
				UserService.sessionExpiredEvent.emit();
			} else if (error.response.status === 403) {
				UserService.invalidPermissionsEvent.emit();
			}
			return Promise.reject(error);
		}
	);
}

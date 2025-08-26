import { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import UserService from "../user-service";

var TOKEN_INTERCEPTOR: number = -1;

function TokenInterceptorAdd(axios: AxiosInstance) {
	TOKEN_INTERCEPTOR = axios.interceptors.request.use(
		(config: InternalAxiosRequestConfig) => {
			const token = UserService.GetToken();

			if (token) {
				config.headers.set("Authorization", `Bearer ${token}`);
			}

			return config;
		},
		(error) => {
			return Promise.reject(error);
		}
	);
}

function TokenInterceptorEject(axios: AxiosInstance) {
	axios.interceptors.request.eject(TOKEN_INTERCEPTOR);
}

const TokenInterceptor = {
	add: TokenInterceptorAdd,
	eject: TokenInterceptorEject,
};

export default TokenInterceptor;

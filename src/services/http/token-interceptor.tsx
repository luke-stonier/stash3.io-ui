import { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import UserService from "../user-service";
import { jwtDecode } from "jwt-decode";

var TOKEN_INTERCEPTOR: number = -1;

function TokenInterceptorAdd(axios: AxiosInstance) {
	TOKEN_INTERCEPTOR = axios.interceptors.request.use(
		(config: InternalAxiosRequestConfig) => {
			const token = UserService.GetToken();
			
			if (token) {
				const tokenDetail = jwtDecode(token);
				const exp = tokenDetail && typeof tokenDetail === "object" && tokenDetail.exp ? tokenDetail.exp * 1000 : null;
				const now = Date.now();
				if (exp && now >= exp) {
					UserService.UpdateSession(null);
					return config;
				}
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

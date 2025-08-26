import { AxiosInstance } from "axios";
import { HTTP_CONSTANTS } from "./constants/http-constants";
import { environment } from "../../environment/environment";

export default function HttpInterceptor(axios: AxiosInstance) {
	axios.interceptors.request.use(
		(config) => {
			config.url = `${HTTP_CONSTANTS.protocol}${HTTP_CONSTANTS.baseAddress}${config.url}`; // pre-set constants

			config.url = config.url
				?.replace(HTTP_CONSTANTS.protocol, environment.protocol)
				.replace(HTTP_CONSTANTS.baseAddress, environment.baseAddress);

			return config;
		},
		(error) => {
			return Promise.reject(error);
		}
	);
}

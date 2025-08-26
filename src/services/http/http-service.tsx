import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { IErrorResp } from "./IErrorResp";
import AuthenticationInterceptor from "./authentication-interceptor";
import HttpInterceptor from "./http-interceptor";
import TokenInterceptor from "./token-interceptor";
import UserSession from "../../Models/UserSession";
import UserService from "../user-service";

export class HttpError {
	public url: string;
	public status: number;
	public message: string;
	public error: IErrorResp;

	constructor(_error: AxiosError) {
		if (_error.config != null) {
			this.url = _error.config.url || "";
			this.status = _error.response?.status || 400;
			this.message = _error.message;
			try {
				if (_error.response === undefined) return;
				this.error = _error.response.data as IErrorResp;
			} catch (exception: any) {} // just catch
		} else {
			console.warn(_error);
		}
	}
}

export interface ResponseCallback<T> {
	success: (_: T) => void;
	error: (err: HttpError) => void;
	always?: () => void;
}

const defaultHeaders = {
	"Content-Type": "application/json",
};

const _axios: AxiosInstance = axios.create({
	headers: defaultHeaders,
});
HttpInterceptor(_axios);
TokenInterceptor.add(_axios);
AuthenticationInterceptor(_axios);

UserService.sessionUpdatedEvent.subscribe((_: UserSession) => {
	TokenInterceptor.eject(_axios);
	TokenInterceptor.add(_axios);
});

function _get<T>(
	url: string,
	success: (data: T) => void = (data: T) => {},
	error: (error: HttpError) => void = (error: HttpError) => {},
	always: () => void = () => {},
	_headers: {} = {}
) {
	_axios
		.get(url, {
			headers: {
				...defaultHeaders,
				..._headers,
			},
		})
		.then((resp: AxiosResponse) => {
			success(resp.data as T);
		})
		.catch((_: AxiosError) => {
			const err = new HttpError(_);
			error(err);
		})
		.finally(() => always());
}

function _post<T, K>(
	url: string,
	data: T,
	success: (data: K) => void = (data: K) => {},
	error: (error: HttpError) => void = (error: HttpError) => {},
	always: () => void = () => {},
	_headers: {} = {}
) {
	_axios
		.post(url, data, {
			headers: {
				...defaultHeaders,
				..._headers,
			},
		})
		.then((resp: AxiosResponse) => {
			success(resp.data as K);
		})
		.catch((_: AxiosError) => {
			const err = new HttpError(_);
			error(err);
		})
		.finally(() => always());
}

function _put<T, K>(
	url: string,
	data: T,
	success: (data: K) => void = (data: K) => {},
	error: (error: HttpError) => void = (error: HttpError) => {},
	always: () => void = () => {},
	_headers: {} = {}
) {
	_axios
		.put(url, data, {
			headers: {
				...defaultHeaders,
				..._headers,
			},
		})
		.then((resp: AxiosResponse) => {
			success(resp.data as K);
		})
		.catch((_: AxiosError) => {
			const err = new HttpError(_);
			error(err);
		})
		.finally(() => always());
}

function _patch<T, K>(
	url: string,
	data: T,
	success: (data: K) => void = (data: K) => {},
	error: (error: HttpError) => void = (error: HttpError) => {},
	always: () => void = () => {},
	_headers: {} = {}
) {
	_axios
		.patch(url, data, {
			headers: {
				...defaultHeaders,
				..._headers,
			},
		})
		.then((resp: AxiosResponse) => {
			success(resp.data as K);
		})
		.catch((_: AxiosError) => {
			const err = new HttpError(_);
			error(err);
		})
		.finally(() => always());
}

function _delete<T>(
	url: string,
	success: (data: T) => void = (data: T) => {},
	error: (error: HttpError) => void = (error: HttpError) => {},
	always: () => void = () => {},
	_headers: {} = {}
) {
	_axios
		.delete(url, {
			headers: {
				...defaultHeaders,
				..._headers,
			},
		})
		.then((resp: AxiosResponse) => {
			success(resp.data as T);
		})
		.catch((_: AxiosError) => {
			const err = new HttpError(_);
			error(err);
		})
		.finally(() => always());
}

const HttpService = {
	get: _get,
	put: _put,
	post: _post,
	patch: _patch,
	delete: _delete,
};

export default HttpService;

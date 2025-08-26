export interface IErrorFix {
	key: string;
	value: string;
}

export interface IErrorResp {
	error?: string;
	fixes?: IErrorFix[] | undefined;
}

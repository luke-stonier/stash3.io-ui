import { IErrorFix, IErrorResp } from "./ActionResults";

export default class StatusResponse<T> {
    public message: string;
    public fixes: IErrorFix[];

    constructor(public status: boolean, public data: T) {
        this.fixes = [];
    }

    public Merge<G>(statusResponse: StatusResponse<G>): StatusResponse<T> {
        this.fixes.push(...statusResponse.fixes);
        this.message = statusResponse.message;
        return this;
    }

    public Update(_status: boolean, _data: T): StatusResponse<T> {
        this.status = _status;
        this.data = _data;
        return this;
    }

    public AddMessage(_message: string): StatusResponse<T> {
        this.message = _message;
        return this;
    }

    public AddFix(_key: string, _value: string): StatusResponse<T> {
        this.fixes.push({ key: _key, value: _value });
        return this;
    }

    public ToErrorResp(): IErrorResp {
        return { error: this.message, fixes: this.fixes };
    }
}

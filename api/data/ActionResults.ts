import { Response } from "express";

export interface IErrorFix {
    key: string;
    value: string;
}

export interface IErrorResp {
    error: string;
    fixes: IErrorFix[] | null;
}

export function OKEMPTY(res: Response): void {
    res.send();
    return;
}

export function OK(res: Response, resp: any): void {
    res.send(resp);
    return;
}

export function STATUS(res: Response, status: number): void {
    if (status.toString().startsWith('4')) console.log('...RETURNED', status);
    res.sendStatus(status);
    return;
}

export function STATUSRESP(res: Response, status: number, resp: any): void {
    res.status(status);
    res.send(resp);
    return;
}

export function STATUSERROR(res: Response, status: number, resp: IErrorResp): void {
    res.status(status);
    res.send(resp);
    return;
}

export function OKFile(res: Response, file: Buffer, fileName: string, contentType: string = "application/octet-stream"): void {
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", file.length);
    res.end(file, "binary");
    return;
}

export function REDIRECT(res: Response, url: string): void {
    res.status(301)
    res.redirect(301, url)
}

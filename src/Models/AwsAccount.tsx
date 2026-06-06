import {JSX} from "react";

export default class AwsAccount {
    public id: string;
    public name: string;
    public handle: string;
    public createdAt: Date;
    public type: 'S3' | 'R2' | 'SFTP';
    public host?: string;
    public port?: number;
    public username?: string;
    public rootPath?: string;
    
    
    // not stored in DB, mapped from handle locally
    public awsAccessKey: string;
    public awsSecretKey: string;
    
    public icon: JSX.Element;
}

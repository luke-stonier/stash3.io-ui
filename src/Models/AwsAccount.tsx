import {JSX} from "react";

export default class AwsAccount {
    public id: string;
    public name: string;
    public handle: string;
    public createdAt: Date;
    public type: 'S3' | 'R2';
    
    
    // not stored in DB, mapped from handle locally
    public awsAccessKey: string;
    public awsSecretKey: string;
    
    public icon: JSX.Element;
}
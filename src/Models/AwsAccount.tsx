export default class AwsAccount {
    public id: string;
    public name: string;
    public handle: string;
    public createdAt: Date;
    
    
    // not stored in DB, mapped from handle locally
    public awsAccessKey: string;
    public awsSecretKey: string;
}
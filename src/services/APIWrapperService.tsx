import UserService from "./user-service";

export default class APIWrapperService {
    static UploadFileToS3 = (bucket: string, key: string, path: string) => {
        const account = UserService.GetAWSAccount();
        if (account === null) return;
        (async() => {
            console.log("Upload", bucket, key, path);
            const resp = await (window as any).api.upload(account.handle, {bucket, key: key, filePath: path});
            console.log("\tupload resp", resp);
        })();
    }
    
    static ListS3Buckets = (): Promise<{Name: string, CreationDate: Date}[]> => {
        const account = UserService.GetAWSAccount();
        if (account === null) return Promise.resolve([]);
        return (window as any).api.listBuckets(account.handle);
    }
    
    static ListS3Objects = (bucket: string, prefix: string = ''): Promise<{ files: any[], folders: any[], error: string  }> => {
        const account = UserService.GetAWSAccount();
        if (account === null) return Promise.resolve({ files: [], folders: [], error: 'No account selected' });
        return (window as any).api.listObjects(account.handle, bucket, prefix);
    };
    
    static GetCredentials = (handle: string): Promise<{accessKey: string, secretKey: string}> => {
        return (window as any).api.getCreds(handle);
    }
    
    static SetCredentials = (handle: string, accessKey: string, secretKey: string) => {
        (window as any).api.setCreds(handle, accessKey, secretKey);
    }
    
    static DeleteCredentials = (handle: string) => {
        (window as any).api.deleteCreds(handle);
    }
    
    
}
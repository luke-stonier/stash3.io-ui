import UserService from "./user-service";
import {ConfirmationService, ToastService} from "./Overlays";
import React from "react";
import BucketService from "./BucketService";
import ErrnoException = NodeJS.ErrnoException;

export type DownloadAllResult = { ok: boolean; count?: number; bytes?: number; error?: string | null };
export type GetCorsResult = { ok: boolean; rules?: Array<any>; error?: string | null };
export type SaveCorsResult = { ok: boolean; error?: string | null };
export type GetBucketPolicyResult = { ok: boolean; policy?: string | null; error?: string | null };
export type SaveBucketPolicyResult = { ok: boolean; error?: string | null };

// USED BY S3-IPC
class Account {
    userId?: string;
    handle: string;
    accountType: 'S3' | 'R2' | 'SFTP';
    r2AccountId?: string; // optional, used if accountType === 'r2'

    host?: string;
    port?: number;
    username?: string;
    rootPath?: string;

    constructor(handle: string, accountType: 'S3' | 'R2' | 'SFTP', r2AccountId?: string, userId?: string, host?: string, port?: number, username?: string, rootPath?: string) {
        this.userId = userId;
        this.handle = handle;
        this.accountType = accountType;
        this.r2AccountId = r2AccountId;
        this.host = host;
        this.port = port;
        this.username = username;
        this.rootPath = rootPath;
    }
}

function normalizeAccountType(type: string): 'S3' | 'R2' | 'SFTP' {
    if (type.toUpperCase() === 'SFTP') return 'SFTP';
    return type.toUpperCase() === 'R2' ? 'R2' : 'S3';
}

export type S3CorsRule = {
    AllowedHeaders?: string[];
    AllowedMethods: string[];
    AllowedOrigins: string[];
    ExposeHeaders?: string[];
    MaxAgeSeconds?: number;
};

export type PublicAccessBlockConfig = {
    BlockPublicAcls?: boolean;
    IgnorePublicAcls?: boolean;
    BlockPublicPolicy?: boolean;
    RestrictPublicBuckets?: boolean;
};

export type GetPublicAccessBlockResult = {
    ok: boolean;
    config?: PublicAccessBlockConfig | null;
    error?: string | null;
};

export type SavePublicAccessBlockResult = {
    ok: boolean;
    error?: string | null;
};

export default class APIWrapperService {
    private static GetSelectedAccountPayload(): Account | null {
        const account = UserService.GetAWSAccount();
        const userId = UserService.GetCurrentUserSession()?.user?.id;

        if (account === null || !userId) return null;

        const payload = new Account(
            account.handle,
            normalizeAccountType(account.type),
            undefined,
            userId,
            account.host,
            account.port,
            account.username,
            account.rootPath,
        );
        console.log("[s3-ui] selected account payload", {
            handle: payload.handle,
            accountType: payload.accountType,
            hasUserId: !!payload.userId,
        });
        return payload;
    }
    
    
    static IPCConfigure(): boolean {
        console.log("Configuring IPC API...");
        if (!(window as any).api) {
            console.error("IPC API not available");
            return false;
        }

        (window as any).api.configureIPC();
        return true;
    }
    
    static async UploadFileToS3 (bucket: string, key: string, path: string, meta: { fileSize: number | undefined }) {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return;
        
        if (key.indexOf('.') === -1) {
            const res =  await (window as any).api.createFolder(account, bucket, key);
            ToastService.Add({
                title: res.ok ? "Folder Created" : "Create Folder Failed",
                message: res.ok ? `Folder "${key}" created successfully.` : (res.error || "The folder creation failed to complete."),
                type: res.ok ? "success" : "error",
                duration: 3000
            })
            BucketService.RefreshItems();
            
            // ITTERATE THROUGH ALL FILES IN PATH AND UPLOAD THEM
            await (window as any).api.getFilesRecursive(path, (err: ErrnoException, files: string[]) => {
                if (err) {
                    ToastService.Add({
                        title: "Error Reading Files",
                        message: `There was an error reading files from the folder: ${err.message}`,
                        type: "error",
                        duration: 5000
                    });
                    return;
                }
                files.forEach((file: any) => {
                    const relativePath = file.replace(path + '/', '');
                    const fileKey = key + '/' + relativePath;
                    (async() => {
                        const resp = await (window as any).api.upload(account, {bucket, key: fileKey, filePath: file});
                        BucketService.RefreshItems();
                        ToastService.Add({
                            title: resp.ok ? "Upload Complete" : "Upload Failed",
                            message: resp.ok ? `File "${fileKey}" uploaded successfully.` : (resp.error || "The upload failed to complete."),
                            type: resp.ok ? "success" : "error",
                            duration: 3000
                        });
                    })();
                }) 
            });
        } else {
            const resp = await (window as any).api.upload(account, {bucket, key: key, filePath: path});
            BucketService.RefreshItems();
            ToastService.Add({
                title: resp.ok ? "Upload Complete" : "Upload Failed",
                message: resp.ok ? `File "${key}" uploaded successfully.` : (resp.error || "The upload failed to complete."),
                type: resp.ok ? "success" : "error",
                duration: 3000
            });
        }
    }
    
    static DeleteFileFromS3 = (bucket: string, key: string) => {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return;

        ConfirmationService.Add({
            title: "Delete Confirmation",
            children: <p>Are you sure you want to delete {key}?</p>,
            onClose: (confirmed) => {
                if (!confirmed) {
                    ToastService.Add({
                        title: "Action Cancelled",
                        message: "The delete action was cancelled.",
                        type: "info",
                        duration: 3000
                    })
                    return;
                }

                (async() => {
                    const resp = await (window as any).api.deleteObject(account, bucket, key);
                    BucketService.RefreshItems();
                    if (resp.ok) {
                        ToastService.Add({
                            title: "Deleted",
                            message: `Object deleted successfully.`,
                            type: "success",
                            duration: 3000
                        });
                    } else {
                        ToastService.Add({
                            title: "Delete failed",
                            message: "The delete action failed to complete.",
                            type: "error",
                            duration: 3000
                        });
                    }
                })();
            },
            confirmColor: "danger",
            cancelColor: "outline-light"
        });
    }
    
    static async CreateFolder (bucket: string, folderName: string) {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return { ok: false, error: 'No account selected' };
        const res =  await (window as any).api.createFolder(account, bucket, folderName);
        ToastService.Add({
            title: res.ok ? "Folder Created" : "Create Folder Failed",
            message: res.ok ? `Folder "${folderName}" created successfully.` : (res.error || "The folder creation failed to complete."),
            type: res.ok ? "success" : "error",
            duration: 3000
        })
        BucketService.RefreshItems();
        return res;
    }
    
    static ListS3Buckets = (): Promise<{Name: string, CreationDate: Date}[]> => {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return Promise.resolve([]);
        return (window as any).api.listBuckets(account);
    }
    
    static ListS3Objects = (bucket: string, prefix: string = ''): Promise<{ files: any[], folders: any[], error: string  }> => {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return Promise.resolve({ files: [], folders: [], error: 'No account selected' });
        return (window as any).api.listObjects(account, bucket, prefix);
    };
    
    static async GetCredentials (userId: string, handle: string): Promise<{accessKeyId: string, secretAccessKey: string}> {
        return await (window as any).api.getCreds(userId, handle);
    }
    
    static SetCredentials = (userId: string, handle: string, accessKey: string, secretKey: string) => {
        return (window as any).api.setCreds(userId, handle, accessKey, secretKey);
    }
    
    static DeleteCredentials = (userId: string, handle: string) => {
        (window as any).api.removeCreds(userId, handle);
    } 

    static DownloadAll = async (bucket: string, destDir: string): Promise<DownloadAllResult> => {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return Promise.resolve({ ok: false, error: 'No account selected' });
        return (window as any).api.downloadAll(account, bucket, destDir);
    };

    static GetCors = async (bucket: string): Promise<GetCorsResult> => {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return Promise.resolve({ ok: false, error: 'No account selected' });
        return (window as any).api.getCors(account, bucket);
    };

    static SaveCors = async (bucket: string, corsRules: S3CorsRule[]): Promise<SaveCorsResult> => {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return Promise.resolve({ ok: false, error: 'No account selected' });
        return (window as any).api.saveCors(account, bucket, corsRules);
    };

    static GetBucketPolicy = async (bucket: string): Promise<GetBucketPolicyResult> => {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return Promise.resolve({ ok: false, error: 'No account selected' });
        return (window as any).api.getBucketPolicy(account, bucket);
    };
    
    static SaveBucketPolicy = async (
        bucket: string,
        policy: string | Record<string, unknown>
    ): Promise<SaveBucketPolicyResult> => {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return Promise.resolve({ ok: false, error: 'No account selected' });
        return (window as any).api.saveBucketPolicy(account, bucket, policy);
    };

    static GetPublicAccessBlock = async (
        bucket: string
    ): Promise<GetPublicAccessBlockResult> => {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return Promise.resolve({ ok: false, error: 'No account selected' });
        return (window as any).api.getPublicAccessBlock(account, bucket);
    };

    static SavePublicAccessBlock = async (
        bucket: string,
        config: PublicAccessBlockConfig
    ): Promise<SavePublicAccessBlockResult> => {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return Promise.resolve({ ok: false, error: 'No account selected' });
        return (window as any).api.savePublicAccessBlock(account, bucket, config);
    };

    static async GetBucketUrl(bucket: string): Promise<string | null> {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return null;

        try {
            const { url, error } = await (window as any).api.getBucketUrl(account, bucket);
            if (error) {
                console.error("GetBucketUrl error:", error);
                return null;
            }
            return url;
        } catch (err) {
            console.error("GetBucketUrl exception:", err);
            return null;
        }
    }
    
    static async GetObjectHead(bucket: string, key: string): Promise<{[key: string]: any} | null> {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return null;

        try {
            const { head, error } = await (window as any).api.getObjectHead(account, bucket, key);
            if (error) {
                console.error("GetObjectHead error:", error, account, bucket, key);
                return null;
            }
            return head;
        } catch (err) {
            console.error("GetObjectHead exception:", err);
            return null;
        }
    }
    
    static async GetPreSignedUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string | null> {
        const account = APIWrapperService.GetSelectedAccountPayload();
        if (account === null) return null;

        try {
            const { url, error } = await (window as any).api.getPreSignedUrl(account, bucket, key, expiresIn);
            if (error) {
                console.error("getPresignedUrl error:", error);
                return null;
            }
            return url;
        } catch (err) {
            console.error("getPresignedUrl exception:", err);
            return null;
        }
    }
}


import UserService from "./user-service";
import {ConfirmationService, ToastService} from "./Overlays";
import React from "react";
import BucketService from "./BucketService";

export default class APIWrapperService {
    static UploadFileToS3 = (bucket: string, key: string, path: string) => {
        const account = UserService.GetAWSAccount();
        if (account === null) return;
        (async() => {
            const resp = await (window as any).api.upload(account.handle, {bucket, key: key, filePath: path});
            BucketService.RefreshItems();
            ToastService.Add({
                title: resp.ok ? "Upload Complete" : "Upload Failed",
                message: resp.ok ? `File "${key}" uploaded successfully.` : (resp.error || "The upload failed to complete."),
                type: resp.ok ? "success" : "error",
                duration: 3000
            })
        })();
    }
    
    static DeleteFileFromS3 = (bucket: string, key: string) => {
        const account = UserService.GetAWSAccount();
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
                    const resp = await (window as any).api.deleteObject(account.handle, bucket, key);
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
        const account = UserService.GetAWSAccount();
        if (account === null) return { ok: false, error: 'No account selected' };
        const res =  await (window as any).api.createFolder(account.handle, bucket, folderName);
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

    static async GetBucketUrl(bucket: string): Promise<string | null> {
        const account = UserService.GetAWSAccount();
        if (account === null) return null;

        try {
            const { url, error } = await (window as any).api.getBucketUrl(account.handle, bucket);
            if (error) {
                console.error("GetBucketUrl error:", error);
                return null;
            }
            console.log("url", url);
            return url;
        } catch (err) {
            console.error("GetBucketUrl exception:", err);
            return null;
        }
    }
    
    static async GetObjectHead(bucket: string, key: string): Promise<{[key: string]: any} | null> {
        const account = UserService.GetAWSAccount();
        if (account === null) return null;

        try {
            const { head, error } = await (window as any).api.getObjectHead(account.handle, bucket, key);
            if (error) {
                console.error("GetObjectHead error:", error);
                return null;
            }
            return head;
        } catch (err) {
            console.error("GetObjectHead exception:", err);
            return null;
        }
    }
    
    static async GetPreSignedUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string | null> {
        const account = UserService.GetAWSAccount();
        if (account === null) return null;

        try {
            const { url, error } = await (window as any).api.getPreSignedUrl(account.handle, bucket, key, expiresIn);
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
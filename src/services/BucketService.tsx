import EventEmitter from "./event-emitter";
import APIWrapperService from "./APIWrapperService";
import BucketObject from "../Models/BucketObject";

export interface IBookmarkedItem {
    key: string;
    type: string;
    value: string;
}

export default class BucketService {
    static currentBucket: string = "";
    static currentPath: string = "";
    
    static UploadFileTrigger = new EventEmitter<void>();
    static bucketOrPathChangeEvent = new EventEmitter<{ bucket: string, path: string } | null>();
    static bucketRefreshEvent = new EventEmitter<void>();
    static previewItemEvent = new EventEmitter<string | null>();
    
    static RemoveGlobalBookmark = (bookmark: IBookmarkedItem) => {
        switch (bookmark.type) {
            case 'bucket':
                BucketService.ToggleBookmarkBucket(bookmark.value);
                break;
            case 'path':
                const firstSlashPos = bookmark.value.indexOf('/');
                if (firstSlashPos > -1) {
                    const bucket = bookmark.value.substring(0, firstSlashPos);
                    const path = bookmark.value.substring(firstSlashPos + 1);
                    BucketService.ToggleBookmarkPath(bucket, path);
                }
                break;
            case 'item':
                const firstSlashPosItem = bookmark.value.indexOf('/');
                if (firstSlashPosItem > -1) {
                    const bucket = bookmark.value.substring(0, firstSlashPosItem);
                    const itemPathAndName = bookmark.value.substring(firstSlashPosItem + 1);
                    BucketService.ToggleBookmarkItem(bucket, itemPathAndName);
                }
                break;
        }
    }
    
    static ToggleBookmarkBucket = (bucket: string) => {
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        if (bookmarkList.findIndex(b => b.type === 'bucket' && b.value === bucket) > -1) {
            bookmarkList = bookmarkList.filter(b => b.value !== bucket);
        } else {
            bookmarkList.push({ key: new Date().getTime().toString(), type: 'bucket', value: bucket });
        }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarkList));

        BucketService.bucketRefreshEvent.emit();
    }
    
    static IsBucketBookmarked = (bucket: string): boolean => {
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        return bookmarkList.findIndex(b => b.type === 'bucket' && b.value === bucket) > -1;
    }
    
    static ToggleBookmarkPath = (bucket: string, path: string) => {
        let fullPath = `${bucket}/${path}`;
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        if (bookmarkList.findIndex(b => b.type === 'path' && b.value === fullPath) > -1) {
            bookmarkList = bookmarkList.filter(b => b.value !== fullPath);
        } else {
            bookmarkList.push({ key: new Date().getTime().toString(), type: 'path', value: fullPath });
        }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarkList));

        BucketService.bucketRefreshEvent.emit();
    }
    
    static IsPathBookmarked = (bucket: string, path: string): boolean => {
        let fullPath = `${bucket}/${path}`;
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        return bookmarkList.findIndex(b => b.type === 'path' && b.value === fullPath) > -1;
    }
    
    static ToggleBookmarkItem = (bucket: string, itemPathAndName: string) => {
        let fullPath = `${bucket}/${itemPathAndName}`;
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        if (bookmarkList.findIndex(b => b.type === 'item' && b.value === fullPath) > -1) {
            bookmarkList = bookmarkList.filter(b => b.value !== fullPath);
        } else {
            bookmarkList.push({ key: new Date().getTime().toString(), type: 'item', value: fullPath });
        }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarkList));

        BucketService.bucketRefreshEvent.emit();
    }
    
    static IsItemBookmarked = (bucket: string, itemPathAndName: string): boolean => {
        let fullPath = `${bucket}/${itemPathAndName}`;
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        return bookmarkList.findIndex(b => b.type === 'item' && b.value === fullPath) > -1;
    }
    
    static GetAllBookmarks = (): IBookmarkedItem[] => {
        let bookmarks = localStorage.getItem('bookmarks');
        return bookmarks ? JSON.parse(bookmarks).sort((a: { key: string },b: { key: string}) => Number.parseInt(b.key) - Number.parseInt(a.key)) : [];
    }
    
    static GetCurrentObjects = (callback: (error: string | undefined, objects: BucketObject[]) => void) => {
        // check if currentBucket and currentPath are set
        if (BucketService.currentBucket === "") { callback("Bucket not set", []); return; }

        APIWrapperService.ListS3Objects(BucketService.currentBucket, BucketService.currentPath).then(resp => {
            if (resp.error !== null) {
                console.log(resp.error);
                callback(undefined, [])
            } else {
                const files = resp.files.map(f => { return new BucketObject({
                    etag: f.ETag ?? "",
                    key: f.Key ?? "",
                    lastModified: f.LastModified ? new Date(f.LastModified) : new Date(0),
                    size: f.Size ?? 0,
                    storageClass: f.StorageClass ?? "",
                })
                })
                const folders = resp.folders.map(f => { return new BucketObject({
                    etag: "",
                    key: f.Prefix ?? "",
                    lastModified: new Date(0),
                    size: 0,
                    storageClass: "",
                })
                });
                callback(undefined, [...files, ...folders]);
            }
        });
    }
    
    static TriggerUploadFile = () => {
        BucketService.UploadFileTrigger.emit();
    };
    
    static ViewItem = (key: string) => {
        console.log(key)
        BucketService.previewItemEvent.emit(key);
    }
    
    static ClearPreview = () => {
        BucketService.previewItemEvent.emit(null);
    }
    
    static RefreshItems = () => {
        BucketService.bucketRefreshEvent.emit();
    }
    
    static SetBucketAndPath = (bucket: string, path: string) => {
        BucketService.currentBucket = bucket;
        BucketService.currentPath = path;
        BucketService.bucketOrPathChangeEvent.emit({bucket, path});
    };
    
    static GetBucketAndPath = (): {bucket: string, path: string} => {
        return {bucket: BucketService.currentBucket, path: BucketService.currentPath};
    };
}
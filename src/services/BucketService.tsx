import EventEmitter from "./event-emitter";

export interface IBookmarkedItem {
    type: string;
    id: string;
}

export default class BucketService {
    static currentBucket: string = "";
    static currentPath: string = "";
    
    static UploadFileTrigger = new EventEmitter<void>();
    static bucketOrPathChangeEvent = new EventEmitter<{ bucket: string, path: string } | null>();
    static bucketRefreshEvent = new EventEmitter<void>();
    static previewItemEvent = new EventEmitter<string | null>();
    
    static ToggleBookmarkBucket = (bucket: string) => {
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        if (bookmarkList.findIndex(b => b.type === 'bucket' && b.id === bucket) > -1) {
            bookmarkList = bookmarkList.filter(b => b.id !== bucket);
        } else {
            bookmarkList.push({ type: 'bucket', id: bucket });
        }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarkList));

        BucketService.bucketRefreshEvent.emit();
    }
    
    static IsBucketBookmarked = (bucket: string): boolean => {
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        return bookmarkList.findIndex(b => b.type === 'bucket' && b.id === bucket) > -1;
    }
    
    static ToggleBookmarkPath = (bucket: string, path: string) => {
        let fullPath = `${bucket}/${path}`;
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        if (bookmarkList.findIndex(b => b.type === 'path' && b.id === fullPath) > -1) {
            bookmarkList = bookmarkList.filter(b => b.id !== fullPath);
        } else {
            bookmarkList.push({ type: 'path', id: fullPath });
        }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarkList));

        BucketService.bucketRefreshEvent.emit();
    }
    
    static IsPathBookmarked = (bucket: string, path: string): boolean => {
        let fullPath = `${bucket}/${path}`;
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        return bookmarkList.findIndex(b => b.type === 'path' && b.id === fullPath) > -1;
    }
    
    static ToggleBookmarkItem = (bucket: string, itemPathAndName: string) => {
        let fullPath = `${bucket}/${itemPathAndName}`;
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        if (bookmarkList.findIndex(b => b.type === 'item' && b.id === fullPath) > -1) {
            bookmarkList = bookmarkList.filter(b => b.id !== fullPath);
        } else {
            bookmarkList.push({ type: 'item', id: fullPath });
        }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarkList));

        BucketService.bucketRefreshEvent.emit();
    }
    
    static IsItemBookmarked = (bucket: string, itemPathAndName: string): boolean => {
        let fullPath = `${bucket}/${itemPathAndName}`;
        let bookmarks = localStorage.getItem('bookmarks');
        let bookmarkList: IBookmarkedItem[] = bookmarks ? JSON.parse(bookmarks) : [];
        return bookmarkList.findIndex(b => b.type === 'item' && b.id === fullPath) > -1;
    }
    
    static GetAllBookmarks = (): IBookmarkedItem[] => {
        let bookmarks = localStorage.getItem('bookmarks');
        return bookmarks ? JSON.parse(bookmarks) : [];
    }
    
    static TriggerUploadFile = () => {
        BucketService.UploadFileTrigger.emit();
    };
    
    static ViewItem = (key: string) => {
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
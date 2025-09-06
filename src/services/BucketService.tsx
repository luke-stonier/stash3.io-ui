import EventEmitter from "./event-emitter";

export default class BucketService {
    static currentBucket: string = "";
    static currentPath: string = "";
    
    static UploadFileTrigger = new EventEmitter<void>();
    static bucketOrPathChangeEvent = new EventEmitter<{ bucket: string, path: string } | null>();
    static bucketRefreshEvent = new EventEmitter<void>();
    static previewItemEvent = new EventEmitter<string | null>();
    
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
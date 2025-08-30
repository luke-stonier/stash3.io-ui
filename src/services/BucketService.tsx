import EventEmitter from "./event-emitter";

export default class BucketService {
    static currentBucket: string = "";
    static currentPath: string = "";
    
    static bucketOrPathChangeEvent = new EventEmitter<{ bucket: string, path: string } | null>();
    
    static SetBucketAndPath = (bucket: string, path: string) => {
        BucketService.currentBucket = bucket;
        BucketService.currentPath = path;
        BucketService.bucketOrPathChangeEvent.emit({bucket, path});
    };
    
    static GetBucketAndPath = (): {bucket: string, path: string} => {
        return {bucket: BucketService.currentBucket, path: BucketService.currentPath};
    };
}
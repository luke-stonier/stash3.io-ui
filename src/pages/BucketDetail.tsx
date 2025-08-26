import UploadPane from "../components/UploadPane";
import {useParams} from "react-router-dom";

export default function BucketDetail() {
    
    // Get the bucket ID from the URL parameters with react-router
    const { bucketId } = useParams<{ bucketId: string }>();

    if (!bucketId) {
        return (
            <div className="container-fluid">
                <h1 className="mb-4">Bucket Not Found</h1>
                <p className="text-muted">The specified bucket does not exist.</p>
            </div>
        );
    }
    
    return (
        <div className="h-100 w-100">
        <UploadPane bucket={bucketId}>
            <div className="container-fluid">
                <h1 className="mb-4">Bucket Details</h1>
            </div>
        </UploadPane>
        </div>
    );
}
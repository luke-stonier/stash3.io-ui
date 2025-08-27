import UploadPane from "../components/UploadPane";
import {Link, useParams} from "react-router-dom";
import Icon from "../components/Icon";

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
                <div className="row">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-start gap-3 mb-4">
                            <Link to={'/'} className="my-0">
                                <Icon name={'chevron_backward'} classes="text-white display-5 my-0" />
                            </Link>
                            <h1 className="my-0">Bucket Details</h1>
                        </div>
                    </div>
                </div>
            </div>
        </UploadPane>
        </div>
    );
}
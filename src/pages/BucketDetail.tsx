import UploadPane from "../components/UploadPane";
import {useNavigate, useParams} from "react-router-dom";
import Icon from "../components/Icon";
import {IconButton} from "../components/Button";

export default function BucketDetail() {
    
    const navigate = useNavigate();
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
                        <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                            <IconButton icon={'arrow_back'} isButton={true} staticClasses={'btn-ghost btn-ghost-warning p-2'}
                                        onClick={() => navigate(-1)}>
                                <span>All Buckets</span>
                            </IconButton>
                            
                        </div>
                    </div>
                    
                    <div className="col-12 mb-3">
                        <div className="d-flex align-items-center gap-3">
                            <Icon name={'inventory_2'} classes={'display-6 text-warning'}/>
                            <p className="my-0 d-block fs-2 fw-bolder">{bucketId}</p>
                        </div>
                    </div>
                </div>
            </div>
        </UploadPane>
        </div>
    );
}
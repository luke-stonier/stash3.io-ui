import UploadPane from "../components/UploadPane";
import {useNavigate, useParams} from "react-router-dom";
import Icon from "../components/Icon";
import {IconButton} from "../components/Button";
import BucketItems from "../components/BucketItems";
import {useCallback, useEffect, useState} from "react";
import APIWrapperService from "../services/APIWrapperService";
import BucketObject from "../Models/BucketObject";

export default function BucketDetail() {
    
    const navigate = useNavigate();
    const { bucketId } = useParams<{ bucketId: string }>();
    const [items, setItems] = useState<BucketObject[]>([]);

    const LoadItems = useCallback(() => {
        if (!bucketId) return;
        APIWrapperService.ListS3Objects(bucketId).then(resp => {
            if (resp.error !== null) {
                console.log(resp.error);   
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
                setItems([...files, ...folders]);
            }
        });
    }, [bucketId]);
    
    useEffect(() => {
        LoadItems();
    }, []);
    
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
        <UploadPane>
            <div className="container-fluid">
                <div className="row border-bottom">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                            <IconButton icon={'arrow_back'} isButton={true} staticClasses={'btn-ghost btn-ghost-warning p-2 gap-2'}
                                        onClick={() => navigate(-1)}>
                                <span>All Buckets</span>
                            </IconButton>
                            
                            <div className="flex-fill"></div>

                            <IconButton onClick={LoadItems} icon={'refresh'} isButton={true} staticClasses={'btn btn-outline-warning p-2 gap-2'}>
                                <span>Refresh Items</span>
                            </IconButton>
                            
                            <IconButton icon={'settings'} filled={true} isButton={true} staticClasses={'btn btn-outline-warning p-2 gap-2'}>
                                <span>Settings</span>
                            </IconButton>
                        </div>
                    </div>
                    
                    <div className="col-12 mb-3 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <Icon name={'inventory_2'} className={'display-6 text-warning'}/>
                            <p className="my-0 d-block fs-2 fw-bolder">{bucketId}</p>
                        </div>
                    </div>
                </div>
                
                <div className="row">
                    <BucketItems bucketId={bucketId} />
                </div>
            </div>
        </UploadPane>
        </div>
    );
}
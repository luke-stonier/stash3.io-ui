import BucketSelector from "../components/BucketSelector";
import Bucket from "../Models/Bucket";
import {IconButton} from "../components/Button";
import {useEffect, useState} from "react";
import HttpService from "../services/http/http-service";

export default function Buckets() {
    
    const [loading, setLoading] = useState<boolean>(true);
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    
    useEffect(() => {
        setLoading(true);
        HttpService.get(`/buckets`, (resp: Bucket[]) => {
            setLoading(false);
            setBuckets(resp);
        }, () => {
            console.error('Failed to fetch buckets');
            setBuckets([]);
            setLoading(false);
        });
    }, [])
    
    if (loading) {
        return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
            <div className="spinner-border text-warning" style={{width: 90, height: 90}} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    }
    
    return <div className="container-fluid px-0 d-flex flex-column align-items-stretch">
        <div className="row">
            <div className="col-6 col-sm-4">
                <IconButton icon={'add'} isButton={true} staticClasses={'btn btn-warning gap-1 justify-content-start'}>
                    <span>Create Bucket</span>
                </IconButton>
            </div>
        </div>
        <div className={`row mt-3 flex-grow-1 flex-fill ${!buckets || buckets.length === 0 ? 'd-flex align-items-center justify-content-center' : ''}`}>
            { (!buckets || buckets.length === 0) && 
                <p style={{ userSelect: 'none' }} className="text-center my-0 display-5">No buckets.</p>
            }
            { buckets && buckets.length > 0 && buckets.map((bucket: Bucket, index: number) => {
                return <div key={`${bucket.id}_${index}`} className="col-6 col-sm-4 col-lg-3 mb-3">
                        <BucketSelector bucket={bucket} altStyle={index % 2 !== 0} />
                </div>
                })
            }
        </div>
    </div>;
}
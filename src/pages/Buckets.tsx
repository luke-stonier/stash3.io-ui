import BucketSelector from "../components/BucketSelector";
import Bucket from "../Models/Bucket";
import {useCallback, useEffect, useState} from "react";
import APIWrapperService from "../services/APIWrapperService";
import UserService from "../services/user-service";

export default function Buckets() {
    
    const [loading, setLoading] = useState<boolean>(true);
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    
    const FetchBuckets = useCallback(() => {
        APIWrapperService.ListS3Buckets().then((resp: { Name: string, CreationDate: Date }[]) => {
            const bucketObjs = resp.map(bucket => {
                return {
                    id: bucket.Name,
                    bucket: bucket.Name,
                    region: undefined,
                    creationDate: bucket.CreationDate,
                }
            });
            setBuckets(bucketObjs);
            setLoading(false);
        }
        ).catch(err => {
            console.error('Failed to list buckets', err);
            setBuckets([]);
            setLoading(false);
        });
    }, [])

    useEffect(() => {
        const caae = UserService.changeAWSAccountEvent.subscribe((account) => {
            setBuckets([]);
            setLoading(true);
            FetchBuckets();
        });
        setLoading(true);
        FetchBuckets();

        return () => {
            UserService.changeAWSAccountEvent.unsubscribe(caae);
        }
    }, [FetchBuckets])
    
    if (loading) {
        return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
            <div className="spinner-border text-warning" style={{width: 90, height: 90}} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    }
    
    return <div className="container-fluid px-0 d-flex flex-column align-items-stretch">
        {/*<div className="row">*/}
        {/*    <div className="col-6 col-sm-4">*/}
        {/*        <IconButton onClick={FetchBuckets} icon={'add'} isButton={true} staticClasses={'btn btn-warning gap-1 justify-content-start'}>*/}
        {/*            <span>Fetch Buckets</span>*/}
        {/*        </IconButton>*/}
        {/*    </div>*/}
        {/*</div>*/}
        
        <div className={`row mt-3 ${!buckets || buckets.length === 0 ? 'flex-grow-1 flex-fill d-flex align-items-center justify-content-center' : ''}`}>
            { (!buckets || buckets.length === 0) && 
                <p style={{ userSelect: 'none' }} className="text-center my-0 display-5">No buckets.</p>
            }
            { buckets && buckets.length > 0 && buckets.map((bucket: Bucket, index: number) => {
                return <div key={`${bucket.id}_${index}`} className="col-6 col-sm-4 col-lg-3 mb-4">
                        <BucketSelector bucket={bucket} altStyle={index % 2 !== 0} />
                </div>
                })
            }
        </div>
    </div>;
}
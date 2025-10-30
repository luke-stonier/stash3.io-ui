import BucketSelector from "../components/BucketSelector";
import Bucket from "../Models/Bucket";
import React, {useCallback, useEffect, useState} from "react";
import UserService from "../services/user-service";
import BucketService from "../services/BucketService";
import Icon from "../components/Icon";

export default function Buckets() {

    const [loading, setLoading] = useState<boolean>(true);
    const [buckets, setBuckets] = useState<Bucket[]>([]);

    const FetchBuckets = useCallback(async () => {
        try {
            const bucketObjs = await BucketService.GetAllBuckets();
            setBuckets(bucketObjs.sort((a, b) => (a.bookmarked ? 0 : 1) - (b.bookmarked ? 0 : 1) || a.bucket.localeCompare(b.bucket)));
            setLoading(false);
        } catch (err) {
            console.error('Failed to list buckets', err);
            setBuckets([]);
            setLoading(false);
        }
    }, [])

    useEffect(() => {
        const caae = UserService.changeAWSAccountEvent.subscribe((account) => {
            setBuckets([]);
            setLoading(true);
            FetchBuckets();
        });

        const bre = BucketService.bucketRefreshEvent.subscribe(() => {
            setTimeout(() => {
                FetchBuckets();
            }, 100);
        });

        setLoading(true);
        FetchBuckets();

        return () => {
            UserService.changeAWSAccountEvent.unsubscribe(caae);
            BucketService.bucketRefreshEvent.unsubscribe(bre);
        }
    }, [FetchBuckets])

    if (loading) {
        return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
            <div className="spinner-border text-warning" style={{width: 90, height: 90}} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    }

    if (!buckets || buckets.length === 0) {
        return <div className="pt-5 d-flex flex-column align-items-center justify-content-center h-100">
            <Icon name={'deployed_code'} className={'text-secondary'} style={{fontSize: '6rem'}}/>
            <h3 className="text-secondary">No buckets yet</h3>
            <p className="text-secondary text-center">Buckets will appear once an account is created.<br/>Buckets can't be created from here at this time.</p>
        </div>;
    }

    return <div className="container-fluid px-0 d-flex flex-column align-items-stretch">

        <div
            className={`row mt-3 ${!buckets || buckets.length === 0 ? 'flex-grow-1 flex-fill d-flex align-items-center justify-content-center' : ''}`}>

            {buckets && buckets.length > 0 && buckets.map((bucket: Bucket, index: number) => {
                return <div key={`${bucket.id}_${index}`} className="col-6 col-sm-4 col-lg-3 mb-4">
                    <BucketSelector bucket={bucket} altStyle={index % 2 !== 0}/>
                </div>
            })
            }
        </div>
    </div>;
}
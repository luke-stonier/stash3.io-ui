import BucketSelector from "../components/BucketSelector";
import Bucket from "../Models/Bucket";
import {IconButton} from "../components/Button";

export default function Home() {
    return <div className="container-fluid px-0">
        <div className="row">
            <div className="col-6 col-sm-4">
                <IconButton icon={'add'} isButton={true} staticClasses={'btn btn-warning gap-1 justify-content-start'}>
                    <span>Create Bucket</span>
                </IconButton>
            </div>
        </div>
        <div className="row mt-3">
            {
                [
                    ({id: 'asdf', region: 'eu-west-2', name: 'Stash3IO'} as Bucket),
                    ({id: 'asdf', region: 'eu-west-2', name: 'MyDataPro'} as Bucket),
                    ({id: 'asdf', region: 'eu-west-2', name: 'S3 Bucket'} as Bucket),
                    ({id: 'asdf', region: 'eu-west-2', name: 'S3 Bucket'} as Bucket),
                    ({id: 'asdf', region: 'eu-west-2', name: 'S3 Bucket'} as Bucket),
                    ({id: 'asdf', region: 'eu-west-2', name: 'S3 Bucket'} as Bucket)
                ].map((bucket: Bucket, index: number) => {
                    return <div key={`${bucket.id}_${index}`} className="col-6 col-sm-4 col-lg-3 mb-3">
                        <BucketSelector bucket={bucket} altStyle={index % 2 !== 0} />
                    </div>
                })
            }
        </div>
    </div>;
}
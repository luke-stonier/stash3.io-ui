import BucketSelector from "../components/BucketSelector";
import Bucket from "../Models/Bucket";

export default function Home() {
    return <div className="container-fluid mt-4">
        <div className="row">
            {
                [
                    ({ id: 'asdf', name: 'Stash3IO' } as Bucket)
                ].map((bucket: Bucket) => {
                    return <div key={bucket.id} className="col-6 col-sm-4">
                        <BucketSelector bucket={bucket}/>
                    </div>
                })
            }
        </div>
    </div>;
}
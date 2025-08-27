import Bucket from "../Models/Bucket";
import Icon from "./Icon";
import {Link} from "react-router-dom";

export default function BucketSelector({bucket, altStyle = false }: { bucket: Bucket, altStyle?: boolean }) {
    const content = <div className="ratio ratio-1x1">
        <button
            className="bg-lighter text-white border-0 overflow-hidden rounded-3 p-3 w-100">
            <div className="flex items-center justify-between gap-2">
                <Icon classes={'display-4 fw-normal'} name={'deployed_code'} filled={altStyle}/>
                <p className="text-center fw-bolder my-0">{bucket.bucket}</p>
                <p className="text-center fw-light my-0">{bucket.region}</p>
            </div>
        </button>
    </div>;
    
    return <Link to={`/buckets/${bucket.id}`} className="text-decoration-none text-reset">
        {content}
    </Link>
}
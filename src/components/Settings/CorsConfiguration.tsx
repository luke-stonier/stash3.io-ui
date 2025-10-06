import JsonEditor from "../JSONEditor";
import APIWrapperService, {S3CorsRule} from "../../services/APIWrapperService";
import {useEffect, useState} from "react";
import BucketService from "../../services/BucketService";

export default function CorsConfiguration() {
    
    const [corsConfig, setCorsConfig] = useState<S3CorsRule | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        (async() => {
            const res = await APIWrapperService.GetCors(BucketService.currentBucket);
            if (res.ok) {
                // setCorsConfig(res.rules as S3CorsRule);
            } else {
                console.error("Failed to fetch CORS configuration:", res.error);
            }
        })();  
    })
    
    return <div>
        <JsonEditor value={{}} indent={2} />
        { error !== null && <div className="alert alert-danger" role="alert">{error}</div> }
        <button className="btn btn-primary">Save CORS Configuration</button>
    </div>
}
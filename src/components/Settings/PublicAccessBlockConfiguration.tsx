import React, {useEffect, useState} from "react";
import APIWrapperService, {
    PublicAccessBlockConfig
} from "../../services/APIWrapperService";
import BucketService from "../../services/BucketService";
import Icon from "../Icon";
import toFriendlyName from "../../helpers/ToFriendlyName";

export default function PublicAccessBlockConfiguration() {
    const [saving, setSaving] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [originalAccessPolicy, setOriginalAccessPolicy] = useState<PublicAccessBlockConfig | null>(null);
    const [accessPolicy, setAccessPolicy] = useState<PublicAccessBlockConfig | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        (async () => {
            const res = await APIWrapperService.GetPublicAccessBlock(BucketService.currentBucket);
            setLoading(false);
            setSaving(null);
            if (res.ok && res.config) {
                setAccessPolicy(res.config);
                setOriginalAccessPolicy(res.config);
            } else {
                setAccessPolicy(null);
                setOriginalAccessPolicy(null);
                setError("Failed to load Public Access Block configuration.");
            }
        })();
    }, [])

    useEffect(() => {
        if (accessPolicy === null || originalAccessPolicy === null) return;
        if (JSON.stringify(originalAccessPolicy) === JSON.stringify(accessPolicy)) return;
        setTimeout(() => {
            (async () => {
                const res = await APIWrapperService.SavePublicAccessBlock(BucketService.currentBucket, accessPolicy)
                if (!res.ok) {
                    setError("Failed to save Public Access Block configuration.");
                    setAccessPolicy(originalAccessPolicy);
                } else {
                    setError(null);
                    setAccessPolicy(accessPolicy);
                    setOriginalAccessPolicy(accessPolicy);
                }
                setSaving(null);
            })();
        }, 200);
    }, [accessPolicy, originalAccessPolicy]);

    if (loading) {
        return <div className="d-flex align-items-center justify-content-center" style={{minHeight: "320px"}}>
            <div className="spinner-border text-warning" style={{width: 100, height: 100}} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    }

    if (accessPolicy === null) {
        return <div className="text-white">Failed to load Public Access Block configuration.</div>
    }

    return <div>
        <div style={{height: '100%'}} className="">
            {(Object.entries(accessPolicy) as [keyof PublicAccessBlockConfig, boolean][])
                .map(([k, val], index) => (
                    <div key={`accessPolicy_${String(k)}_${index}`} className="mb-2">
                        <button
                            disabled={saving !== null}
                            type="button"
                            onClick={() => {
                                if (saving) return;
                                setSaving(k);
                                setAccessPolicy(prev => {
                                    if (!prev) return prev; // or return {} if you want to reset instead
                                    return {...prev, [k]: !prev[k]};
                                })
                            }}
                            className={`bg-transparent border-0 p-0 m-0 d-flex align-items-center justify-content-start gap-2 ${saving === null ? '' :  'opacity-25'}`}
                        >
                            {
                                saving === k ?
                                    <div className="spinner-grow text-warning" style={{ width: 30, height: 30 }}
                                         role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    :
                                    <Icon
                                        style={{ width: 30, height: 30 }}
                                        className={`fs-2 my-0 ${val ? 'text-warning' : 'text-white'}`}
                                        name={val ? 'check_circle' : 'circle'}
                                        filled={val}/>
                            }
                            <p className="d-block fs-6 my-0 text-white">{toFriendlyName(String(k))}</p>
                        </button>
                    </div>
                ))}

            {error !== null && <div className="alert alert-danger" role="alert">{error}</div>}
        </div>
    </div>
}
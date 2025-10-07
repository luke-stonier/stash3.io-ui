import {useCallback, useEffect, useState} from "react";
import APIWrapperService, {GetBucketPolicyResult} from "../../services/APIWrapperService";
import BucketService from "../../services/BucketService";
import JsonEditor from "../JSONEditor";
import {ToastService} from "../../services/Overlays";

export default function BucketPolicyConfiguration() {

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [originalPolicyConfig, setOriginalPolicyConfig] = useState<GetBucketPolicyResult | null>(null);
    const [policyConfig, setPolicyConfig] = useState<GetBucketPolicyResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        (async () => {
            const res = await APIWrapperService.GetBucketPolicy(BucketService.currentBucket);
            setLoading(false);
            if (res.ok && res.policy) {
                const policy = JSON.parse(res.policy) as GetBucketPolicyResult
                setPolicyConfig(policy);
                setOriginalPolicyConfig(policy);
            } else {
                console.error("Failed to fetch Policy configuration:", res.error);
            }
        })();
    }, [])

    const saveBucketPolicy = useCallback(() => {
        if (policyConfig === null) return;
        if (saving) return;
        setSaving(true);
        (async () => {
            const res = await APIWrapperService.SaveBucketPolicy(BucketService.currentBucket, policyConfig);
            setSaving(false);
            if (res.ok) {
                setOriginalPolicyConfig(policyConfig);
                ToastService.Add({
                    id: 'toast-policy-saved',
                    title: 'Bucket Policy Configuration Saved',
                    message: 'Bucket Policy configuration has been successfully saved.',
                    type: 'success',
                    duration: 5000
                })
            } else {
                console.error("Failed to save Bucket Policy configuration:", res.error);
            }
        })();
        //eslint-disable-next-line
    }, [policyConfig])
    
    const canSavePolicy = useCallback(() => {
        if (policyConfig === null || originalPolicyConfig === null) return false;
        if (error !== null) return false;
        return JSON.stringify(policyConfig) !== JSON.stringify(originalPolicyConfig);
    }, [policyConfig, originalPolicyConfig, error]);

    if (loading) {
        return <div className="d-flex align-items-center justify-content-center" style={{minHeight: "320px"}}>
                <div className="spinner-border text-warning" style={{ width: 100, height: 100 }} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    }

    return <div>
        {policyConfig !== null && <JsonEditor value={policyConfig} indent={2} onTextChange={(text: string) => {
            try {
                const parsed = JSON.parse(text) as GetBucketPolicyResult;
                setPolicyConfig(parsed);
                setError(null);
            } catch (e) {
                setError("Invalid JSON format");
            }
        }} /> }
        { error !== null && <div className="alert alert-danger" role="alert">{error}</div> }
        <button disabled={saving || !canSavePolicy()}
                onClick={saveBucketPolicy}
                className={`me-0 ms-auto d-block btn ${!canSavePolicy() ? 'btn-outline-warning opacity-75' : 'btn-warning'}`}>
            Save Bucket Policy
            {saving && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>}
        </button>
    </div>
}
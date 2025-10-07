import JsonEditor from "../JSONEditor";
import APIWrapperService, {S3CorsRule} from "../../services/APIWrapperService";
import {useCallback, useEffect, useState} from "react";
import BucketService from "../../services/BucketService";
import {ToastService} from "../../services/Overlays";

export default function CorsConfiguration() {

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [originalCorsConfig, setOriginalCorsConfig] = useState<S3CorsRule[] | null>(null);
    const [corsConfig, setCorsConfig] = useState<S3CorsRule[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        (async () => {
            const res = await APIWrapperService.GetCors(BucketService.currentBucket);
            setLoading(false);
            if (res.ok) {
                setCorsConfig(res.rules as S3CorsRule[]);
                setOriginalCorsConfig(res.rules as S3CorsRule[]);
            } else {
                console.error("Failed to fetch CORS configuration:", res.error);
            }
        })();
    }, []);

    const saveCorsPolicy = useCallback(() => {
        if (corsConfig === null) return;
        if (saving) return;
        setSaving(true);
        (async () => {
            const res = await APIWrapperService.SaveCors(BucketService.currentBucket, corsConfig);
            setSaving(false);
            if (res.ok) {
                setOriginalCorsConfig(corsConfig);
                ToastService.Add({
                    id: 'toast-cors-saved',
                    title: 'CORS Configuration Saved',
                    message: 'CORS configuration has been successfully saved.',
                    type: 'success',
                    duration: 5000
                })
            } else {
                console.error("Failed to save CORS configuration:", res.error);
            }
        })();
        
        // eslint-disable-next-line
    }, [corsConfig])

    const canSavePolicy = useCallback(() => {
        if (corsConfig === null || originalCorsConfig === null) return false;
        if (error !== null) return false;
        return JSON.stringify(corsConfig) !== JSON.stringify(originalCorsConfig);
    }, [corsConfig, originalCorsConfig, error]);

    if (loading) {
        return <div className="d-flex align-items-center justify-content-center" style={{minHeight: "320px"}}>
            <div className="spinner-border text-warning" style={{width: 100, height: 100}} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    }

    return <div>
        {corsConfig !== null && <JsonEditor value={corsConfig} indent={2} onTextChange={(text: string) => {
            try {
                const parsed = JSON.parse(text) as S3CorsRule[];
                setCorsConfig(parsed);
                setError(null);
            } catch (e) {
                setError("Invalid JSON format");
            }
        }}/>}
        {error !== null && <div className="alert alert-danger" role="alert">{error}</div>}
        <button disabled={saving || !canSavePolicy()}
                onClick={saveCorsPolicy}
                className={`me-0 ms-auto d-block btn ${!canSavePolicy() ? 'btn-outline-warning opacity-75' : 'btn-warning'}`}>
            Save CORS Configuration
            {saving && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>}
        </button>
    </div>
}
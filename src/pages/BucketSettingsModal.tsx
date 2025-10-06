import Icon from "../components/Icon";
import React from "react";

type BucketSettingsProps = {
    bucketId: string;
    onClose: () => void;
}

export function BucketSettings() {
    return <div>
        <p>hi</p>
    </div>
}

export default function BucketSettingsModal({ bucketId, onClose }: BucketSettingsProps) {
    return (
        <div onClick={onClose} className="position-absolute d-flex align-items-center justify-content-center"
             style={{top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(255,255,255,0.5)', zIndex: 300}}>
            <div className="d-flex flex-column shadow-lg bg-dark rounded-3 p-3" style={{width: '100%', maxWidth: '90vw', maxHeight: '75vh', height: '100vh'}}
                 onClick={(e) => e.stopPropagation()}>
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <p className="my-0 fs-4">{bucketId} settings</p>
                    </div>

                    <div onClick={onClose} style={{cursor: 'pointer'}}><Icon name={'close'} className={'fs-4'}/></div>
                </div>

                <div className="flex-fill bg-lighter p-2 rounded-3 shadow-lg overflow-hidden">
                    <BucketSettings />
                </div>

                <div className="mt-3 d-flex align-items-center justify-content-between w-100">
                    <button className="me-0 ms-auto d-block btn btn-outline-warning" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
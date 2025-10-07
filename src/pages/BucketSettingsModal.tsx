import Icon from "../components/Icon";
import React from "react";
import DownloadAllFiles from "../components/Settings/DownloadAllFiles";
import CorsConfiguration from "../components/Settings/CorsConfiguration";
import BucketPolicyConfiguration from "../components/Settings/BucketPolicyConfiguration";
import PublicAccessBlockConfiguration from "../components/Settings/PublicAccessBlockConfiguration";

type BucketSettingsProps = {
    bucketId: string;
    onClose: () => void;
}

export function BucketSettings() {
    
    const settings = [
        {
            title: "Download All Files",
            description: "Download all files in this bucket as a ZIP archive.",
            component: <DownloadAllFiles />
        },
        {
            title: "Bucket Policy Configuration",
            description: "Configure policy rules for this bucket.",
            component: <BucketPolicyConfiguration />
        },
        {
            title: "Edit CORS Configuration",
            description: "Configure Cross-Origin Resource Sharing (CORS) rules for this bucket.",
            component: <CorsConfiguration />
        },
        {
            title: "Public Access Block Configuration",
            description: "Manage public access settings for this bucket to enhance security.",
            component: <PublicAccessBlockConfiguration />
        }
    ]
    
    return <div className="accordion" id="settings-accordion">
        {
            settings.map((setting, index) => {
                const headingId = `heading-${index}`;
                const collapseId = `collapse-${index}`;
                return <div className="accordion-item bg-dark border-0 mb-2" key={index}>
                        <h2 className="accordion-header" id={headingId}>
                            <button className="accordion-button bg-dark text-white collapsed" type="button"
                                    data-bs-toggle="collapse"
                                    data-bs-target={`#${collapseId}`} aria-expanded="false" aria-controls={collapseId}>
                                {setting.title}
                            </button>
                        </h2>
                        <div id={collapseId} className="bg-lighter border-start border-bottom border-end border-dark border-2 rounded-bottom overflow-hidden shadow-lg accordion-collapse collapse" aria-labelledby={headingId}
                             data-bs-parent="#settings-accordion">
                            <div className="accordion-body text-white">
                                <p className="text-muted">{setting.description}</p>
                                {setting.component}
                            </div>
                        </div>
                    </div>;
            })
        }
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
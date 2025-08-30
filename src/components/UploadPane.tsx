// example UploadPane.tsx
import React, {useCallback, useEffect, useState} from "react";
import Icon from "./Icon";
import APIWrapperService from "../services/APIWrapperService";
import BucketService from "../services/BucketService";

type UploadItem = {
    key: string;
    path: string;
    loaded: number;
    total?: number;
    status: "queued" | "running" | "done" | "error"
};

export default function UploadPane({children}: { children: React.ReactNode; }) {

    const [bucket, setBucket] = useState<string>("");
    const [path, setPath] = useState<string>("");
    const [items, setItems] = useState<UploadItem[]>([]);
    const [paneVisible, setPaneVisible] = useState(false);

    useEffect(() => {
        const bpce = BucketService.bucketOrPathChangeEvent.subscribe((res: { bucket: string, path: string } | null) => {
            if (res === null) return;
            setBucket(res.bucket);
            setPath(res.path);
        });

        setBucket(BucketService.currentBucket);
        setPath(BucketService.currentPath);

        return () => {
            BucketService.bucketOrPathChangeEvent.unsubscribe(bpce);
        }
    }, []);

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setPaneVisible(true);
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const newItems = files.map(f => ({
            key: f.name,
            path: f.webkitRelativePath,
            loaded: 0,
            total: f.size,
            status: "queued" as const
        }));
        setItems(prev => [...prev, ...newItems]);
        setPaneVisible(false);
    };

    const startUpload = useCallback(async (it: UploadItem) => {
        setItems(prev => prev.map(p => p === it ? {...p, status: "running"} : p));
        try {
            APIWrapperService.UploadFileToS3(bucket, it.key, it.path);
            setItems(prev => prev.map(p => p === it ? {...p, status: "done"} : p));
        } catch {
            setItems(prev => prev.map(p => p === it ? {...p, status: "error"} : p));
        }
    }, [bucket]);

    useEffect(() => {
        (window as any).api.onUploadEnd((p: { key: string; status: boolean }) => {
            console.log("Upload end", p);
            setItems(prev => prev.map(it => it.key === p.key ? {
                ...it,
                status: p.status ? "done" : "error",
                loaded: it.total ?? it.loaded
            } : it));
        });

        (window as any).api.onUploadProgress((p: { key: string; loaded: number; total?: number }) => {
            setItems(prev => prev.map(it => it.key === p.key ? {
                ...it,
                loaded: p.loaded,
                total: p.total ?? it.total
            } : it));
        });
    }, []);

    useEffect(() => {
        // kick off queued uploads (simple serial; make it parallel if you want)
        const next = items.find(i => i.status === "queued");
        if (next) startUpload(next);
    }, [items, startUpload]);

    return (
        <div
            className="w-100 h-100"
            onDragOver={onDragOver}
            onDragExit={() => setPaneVisible(false)}
            onDragEnd={() => setPaneVisible(false)}
            onDragLeave={(e) => {
                if (e.pageX === 0 && e.pageY === 0) {
                    // This is a hack to prevent the pane from closing when dragging outside the window
                    // Electron sends a dragleave event with pageX/Y of 0 when dragging outside the window
                    setPaneVisible(false);
                }
            }}
            onDrop={onDrop}
        >
            {paneVisible && <div
                className="position-fixed top-0 start-0 end-0 bottom-0 p-3 rounded-3 text-center d-flex align-items-center justify-content-center flex-column"
                style={{backgroundColor: "rgba(0, 0, 0, 0.9)"}}>
                <div
                    className="p-4 rounded-3 w-100 h-100 text-center d-flex align-items-center justify-content-center flex-column shadow-lg"
                    style={{border: "1px dashed var(--bs-warning)", backgroundColor: "rgba(0, 0, 0, 0.2)"}}>

                    <Icon name={'cloud_upload'} className={'display-1 my-0 text-warning'}/>
                    <div className="mb-3 mx-auto text-center">
                        <p className={'fs-4 my-0'}>Drop files here to upload to <strong>{bucket}</strong></p>
                        <span className={'small text-muted'}>{path}</span>
                    </div>
                    <button className="btn btn-danger rounded-pill px-4" onClick={() => setPaneVisible(false)}>Cancel
                    </button>
                </div>
            </div>
            }
            {items && items.length > 0 && <div>
                <ul className="list-unstyled text-start">
                    {items.map(it => (
                        <li key={it.key} className="mb-2">
                            {it.key} — {it.status}
                            {it.total ? (
                                <div className={`progress mt-1`} role="progressbar"
                                     aria-valuenow={Math.floor((it.loaded / it.total) * 100)} aria-valuemin={0}
                                     aria-valuemax={100}>
                                    <div
                                        className={`progress-bar ${it.status === 'error' ? 'bg-danger' : 'bg-success'}`}
                                        style={{width: `${(it.loaded / it.total) * 100}%`}}/>
                                </div>
                            ) : null}
                        </li>
                    ))}
                </ul>
            </div>}
            {children}
        </div>
    );
}
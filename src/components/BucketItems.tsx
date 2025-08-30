import React, {useCallback, useEffect, useMemo, useState} from "react";
import BucketObject from "../Models/BucketObject";
import Icon from "./Icon";
import APIWrapperService from "../services/APIWrapperService";
import BucketService from "../services/BucketService";

type BucketItemsProps = {
    bucketId: string;
}

export default function BucketItems(props: BucketItemsProps) {

    const [loading, setLoading] = useState<boolean>(false);
    const [items, setItems] = useState<BucketObject[]>([]);
    const [currentPrefix, setCurrentPrefix] = useState<string>("");

    const directoryItems = useMemo(() => {
        const list = items.filter((i) => i.isInDirectory(currentPrefix));

        return list.sort((a, b) => {
            const ad = a.isDirectory(), bd = b.isDirectory();
            if (ad !== bd) return ad ? -1 : 1;
            return a.displayName(currentPrefix).localeCompare(b.displayName(currentPrefix));
        });
    }, [items, currentPrefix]);

    const LoadItems = useCallback((prefix: string) => {
        if (!props.bucketId) return;
        setLoading(true);
        console.log(`Loading items for bucket=${props.bucketId} prefix="${prefix}"`);
        APIWrapperService.ListS3Objects(props.bucketId, prefix).then(resp => {
            if (resp.error !== null) {
                console.log(resp.error);
                setLoading(false);
            } else {
                const files = resp.files.map(f => { return new BucketObject({
                    etag: f.ETag ?? "",
                    key: f.Key ?? "",
                    lastModified: f.LastModified ? new Date(f.LastModified) : new Date(0),
                    size: f.Size ?? 0,
                    storageClass: f.StorageClass ?? "",
                })
                })
                const folders = resp.folders.map(f => { return new BucketObject({
                    etag: "",
                    key: f.Prefix ?? "",
                    lastModified: new Date(0),
                    size: 0,
                    storageClass: "",
                })
                });
                setItems([...files, ...folders]);
                setLoading(false);
            }
        });
    }, [props.bucketId, currentPrefix]);

    useEffect(() => {
        LoadItems("");
        BucketService.SetBucketAndPath(props.bucketId, "");
    }, []);

    useEffect(() => {
        LoadItems(currentPrefix);
        BucketService.SetBucketAndPath(props.bucketId, currentPrefix);
    }, [currentPrefix]);

    const goInto = (dirName: string) => {
        const prefix = currentPrefix ? `${trimSlash(currentPrefix)}/${dirName}/` : `${dirName}/`
        setCurrentPrefix(prefix);
        BucketService.SetBucketAndPath(props.bucketId, prefix);
    };

    const canGoUp = currentPrefix !== "";
    const goUp = () => {
        if (!canGoUp) return;
        const parts = trimSlash(currentPrefix).split("/");
        parts.pop(); // remove current dir
        const prefix = parts.length ? parts.join("/") + "/" : "";
        setCurrentPrefix(prefix);
        BucketService.SetBucketAndPath(props.bucketId, prefix);
    };
    
    return <div className={'px-0'}>

        <div className="d-flex align-items-center gap-2 my-2">
            <span className="text-secondary small">{currentPrefix || "(root)"}</span>
        </div>

        <table className="table table-dark table-hover">
            <thead>
            <tr>
                <th scope="col" style={{ width: '60%' }}>File Name</th>
                <th scope="col">Size</th>
                <th scope="col">Last Modified</th>
                {/*<th scope="col">Status</th>*/}
            </tr>
            </thead>
            <tbody>

            { canGoUp && <tr role="button">
                <td onClick={() => {canGoUp && goUp()}}>
                    <div className="d-flex align-items-center gap-2" style={{ userSelect: "none" }}>
                        <Icon name={'folder'} />
                        <span className={"text-warning fw-semibold"}>..</span>
                    </div>
                </td>
                <td>{'—'}</td>
                <td>{'—'}</td>
            </tr>
            }
            
            {directoryItems.map((item) => {
                const name = item.displayName(currentPrefix);
                const isDir = item.isDirectory();

                if (item.key === currentPrefix && isDir) return null;
                
                return (
                    <tr key={item.key} role="button">
                        <td onClick={() => {isDir && goInto(name)}}>
                            <div className="d-flex align-items-center gap-2">
                                <Icon name={isDir ? "folder" : "article"} filled />
                                <span className={isDir ? "text-warning fw-semibold" : ""}>{name}</span>
                            </div>
                        </td>
                        <td>{isDir ? "—" : `${(item.size / (1024 * 1024)).toFixed(2)} MB`}</td>
                        <td>{isDir ? '—' : item.lastModified?.toLocaleString?.() ?? "—"}</td>
                    </tr>
                );
            })}
            {directoryItems.length === 0 && (
                <tr style={{ userSelect: "none" }}>
                    <td colSpan={3} className="text-center text-secondary py-4" style={{ userSelect: "none" }}>
                        Empty folder. Drop files here to upload.
                    </td>
                </tr>
            )}
            </tbody>
        </table>
    </div>
}

function trimSlash(s: string) {
    return s.replace(/^\/+|\/+$/g, "");
}
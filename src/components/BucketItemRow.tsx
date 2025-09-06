import Icon from "./Icon";
import React from "react";
import {useContextMenu} from "../hooks/useContextMenu";
import {MenuItem} from "./ContextMenu";
import BucketService from "../services/BucketService";
import BucketObject from "../Models/BucketObject";
import APIWrapperService from "../services/APIWrapperService";
import {ToastService} from "../services/Overlays";

type BucketItemRowProps = {
    item: BucketObject;
    isDir: boolean;
    name: string;
    goInto: (name: string) => void;
}

export default function BucketItemRow({isDir, name, item, goInto}: BucketItemRowProps) {

    const {open, contextElement} = useContextMenu();
    const handleOpen = () => BucketService.ViewItem(item.key);
    const handleCopyKey = () => {
        navigator.clipboard.writeText(item.key);
        ToastService.Add(
            {
                title: "Copied",
                message: "The object key has been copied to your clipboard.",
                type: "success",
                duration: 3000
            }
        )
    }

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(name);
        ToastService.Add(
            {
                title: "Copied",
                message: "The URL has been copied to your clipboard.",
                type: "success",
                duration: 3000
            }
        )
    }
    
    const handleDelete = () => APIWrapperService.DeleteFileFromS3(BucketService.currentBucket, item.key);
    
    const preview = async (item: BucketObject) => {
        if (isDir) return;
        BucketService.ViewItem(item.key);
    }

    const contextOptions: MenuItem[] = isDir ?
        [
            {type: "title", data: name},
            {id: "open", label: "Open", icon: <Icon name="folder_open" filled/>, onClick: () => goInto(name)},
            {type: "separator"},
            {id: "delete", label: "Delete", icon: <Icon name="delete" filled/>, onClick: handleDelete},
        ] :
        [
            {type: "title", data: name},
            {id: "preview", label: "Preview", icon: <Icon name="preview" filled/>, onClick: handleOpen},
            {id: "copy_key", label: "Copy Key", icon: <Icon name="content_copy"/>, onClick: handleCopyKey},
            {id: "copy_url", label: "Copy Url", icon: <Icon name="link"/>, onClick: handleCopyUrl},
            {type: "separator"},
            {id: "delete", label: "Delete", icon: <Icon name="delete" filled/>, onClick: handleDelete},
        ]
    
    const fileSize = () => {
        if (isDir) return '—';
        
        // CALCULATE SIZE and size suffix
        if (!item.size || item.size < 0) return '0.00B';
        if (item.size < 1024) return `${item.size} B`;
        if (item.size < 1024 * 1024) return `${(item.size / 1024).toFixed(2)} KB`;
        return `${(item.size / (1024 * 1024)).toFixed(2)} MB`;
    }

    return <>
        <tr role="button"
            onContextMenu={(e) =>
                open(e, contextOptions)
            }
            style={{cursor: "pointer"}}
            onClick={() => {
                if (isDir) goInto(name)
                else preview(item)
            }}
        >
            <td>
                <div className="d-flex align-items-center gap-2">
                    <Icon name={isDir ? "folder" : "article"} filled/>
                    <span className={isDir ? "text-warning fw-semibold" : ""}>{name}</span>
                </div>
            </td>
            <td>{fileSize()}</td>
            <td>{isDir ? '—' : item.lastModified?.toLocaleString?.() ?? "—"}</td>
        </tr>

        {contextElement}
    </>
}
import Bucket from "../Models/Bucket";
import Icon from "./Icon";
import {Link} from "react-router-dom";
import {useContextMenu} from "../hooks/useContextMenu";
import {MenuItem} from "./ContextMenu";
import BucketService from "../services/BucketService";
import {useEffect, useState} from "react";

export default function BucketSelector({bucket, altStyle = false}: { bucket: Bucket, altStyle?: boolean }) {

    const {open, contextElement} = useContextMenu();
    const [bookmarked, setBookmarked] = useState(BucketService.IsBucketBookmarked(bucket.bucket));

    const contextOptions: MenuItem[] = [
        {type: "title", data: bucket.bucket},
        {
            id: "open", label: "Open Bucket", icon: <Icon name="folder_open" filled/>, onClick: () => {
            }
        },
        {
            id: "bookmark", label: bookmarked ? "Remove Bookmark" : "Bookmark", icon: <Icon name="bookmark"/>, onClick: () => {
                BucketService.ToggleBookmarkBucket(bucket.bucket)
            }
        },
        {type: "separator"},
        {
            id: "copy-name", label: "Copy Bucket Name", icon: <Icon name="content_copy" filled/>, onClick: () => {
                navigator.clipboard.writeText(bucket.bucket);
            }
        },
        {
            id: "copy-region", label: "Copy Bucket Region", icon: <Icon name="content_copy" filled/>, onClick: () => {
                navigator.clipboard.writeText(bucket.region || '');
            }
        },
        {type: "separator"},
        {
            id: "delete",
            label: "Delete Bucket",
            className: 'bg-danger',
            icon: <Icon name="delete" filled/>,
            onClick: () => {
            }
        },
    ]
    
    useEffect(() => {
        const bre = BucketService.bucketRefreshEvent.subscribe(() => {
            setTimeout(() => {
                setBookmarked(BucketService.IsBucketBookmarked(bucket.bucket));
            }, 100);
        });
        return () => {
            BucketService.bucketRefreshEvent.unsubscribe(bre);
        }
    }, [])

    const content = <div className="ratio ratio-1x1 position-relative">
        {
            bookmarked ? <div className="position-absolute d-flex align-items-start justify-content-end w-100 h-100 end-0 top-0 p-2"  style={{ zIndex: 1 }}>
                <Icon name={'bookmark_check'} className={'text-white fs-2'} filled />
            </div> : null
        }
        <button
            className="bg-lighter text-white border-0 overflow-hidden rounded-3 p-3 w-100">
            <div className="flex items-center justify-between gap-2">
                <Icon className={'display-4 fw-normal text-warning'} name={'deployed_code'} filled={altStyle}/>
                <p className="text-center fw-bolder my-0">{bucket.bucket}</p>
                <p className="text-center fw-light my-0">{bucket.region}</p>
            </div>
        </button>
    </div>;

    return <>
        <Link
            onContextMenu={(e) =>
                open(e, contextOptions)
            }
            to={`/buckets/${bucket.id}`}
            className="text-decoration-none text-reset">
            {content}
        </Link>
        {contextElement}
    </>
}
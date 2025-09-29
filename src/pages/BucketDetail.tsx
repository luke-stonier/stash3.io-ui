import UploadPane from "../components/UploadPane";
import {useNavigate, useParams} from "react-router-dom";
import Icon from "../components/Icon";
import {IconButton} from "../components/Button";
import BucketItems from "../components/BucketItems";
import React, {useEffect, useState} from "react";
import APIWrapperService from "../services/APIWrapperService";
import BucketObject from "../Models/BucketObject";
import CreateFolderModal from "../components/CreateFolderModal";
import BucketService from "../services/BucketService";
import UserService from "../services/user-service";
import MediaViewerModal from "../components/MediaViewerModal";
import {ToastService} from "../services/Overlays";

export default function BucketDetail() {

    const navigate = useNavigate();
    const {bucketId} = useParams<{ bucketId: string }>();
    const [loading, setLoading] = useState<boolean>(true);
    const [, setItems] = useState<BucketObject[]>([]);
    const [creatingFolder, setCreatingFolder] = useState<boolean>(false);
    const [viewingItem, setViewingItem] = useState<string | null>(null);
    const [mediaViewerOpen, setMediaViewerOpen] = useState<boolean>(false);
    const [bookmarked, setBookmarked] = useState<boolean>(BucketService.currentPath === '' ? BucketService.IsBucketBookmarked(BucketService.currentBucket) : BucketService.IsPathBookmarked(BucketService.currentBucket, BucketService.currentPath));
    const [bookmarkType, setBookmarkType] = useState<'bucket' | 'path'>(BucketService.currentPath === '' ? 'bucket' : 'path');
    

    useEffect(() => {
        BucketService.SetBucketAndPath(bucketId || '', '');
        setTimeout(() => {
            setBookmarked(BucketService.currentPath === '' || BucketService.currentPath === undefined ? BucketService.IsBucketBookmarked(BucketService.currentBucket) : BucketService.IsPathBookmarked(BucketService.currentBucket, BucketService.currentPath))
            setLoading(false);
        }, 100)
        
        const caae = UserService.changeAWSAccountEvent.subscribe(() => {
            setItems([]);
            BucketService.RefreshItems();
        })
        
        if (UserService.GetAWSAccount() !== null) {
            BucketService.RefreshItems();
        }
        
        return () => {
            UserService.changeAWSAccountEvent.unsubscribe(caae);
        }
    }, []);

    useEffect(() => {
        const pie = BucketService.previewItemEvent.subscribe((item: string | null) => {
            setViewingItem(item);
            if (item === null) setMediaViewerOpen(false);
            else setMediaViewerOpen(true);
        });
        
        const pce = BucketService.bucketOrPathChangeEvent.subscribe((bpc) => {
            setBookmarked(BucketService.currentPath === '' || BucketService.currentPath === undefined ? BucketService.IsBucketBookmarked(BucketService.currentBucket) : BucketService.IsPathBookmarked(BucketService.currentBucket, BucketService.currentPath))
            setBookmarkType(BucketService.currentPath === '' ? 'bucket' : 'path');
        });
        
        const bre = BucketService.bucketRefreshEvent.subscribe(() => {
            setTimeout(() => {
                setBookmarked(BucketService.currentPath === '' || BucketService.currentPath === undefined ? BucketService.IsBucketBookmarked(BucketService.currentBucket) : BucketService.IsPathBookmarked(BucketService.currentBucket, BucketService.currentPath))
                setBookmarkType(BucketService.currentPath === '' ? 'bucket' : 'path');
            }, 100);
        });

        return () => {
            BucketService.previewItemEvent.unsubscribe(pie);
            BucketService.bucketOrPathChangeEvent.unsubscribe(pce);
            BucketService.bucketRefreshEvent.unsubscribe(bre);
        }
    }, [])

    if (!bucketId) {
        return (
            <div className="container-fluid">
                <h1 className="mb-4">Bucket Not Found</h1>
                <p className="text-muted">The specified bucket does not exist.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center h-100 w-100">
                <div className="spinner-border text-warning" style={{width: 90, height: 90}} role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-100 w-100">

            { mediaViewerOpen && viewingItem && <MediaViewerModal bucket={BucketService.currentBucket} objectKey={viewingItem} onClose={() => setMediaViewerOpen(false)} /> }

            {creatingFolder && <div className="row">
                <CreateFolderModal bucket={bucketId} currentPath={BucketService.currentPath} onClose={() => {
                    setCreatingFolder(false);
                    //
                }}/>
            </div>
            }

            <UploadPane>
                <div className="container-fluid">
                    <div className="row border-bottom">
                        <div className="col-12">
                            <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                                <IconButton icon={'arrow_back'} isButton={true}
                                            staticClasses={'btn-ghost btn-ghost-warning p-2 gap-2'}
                                            onClick={() => navigate('/buckets')}>
                                    <span>All Buckets</span>
                                </IconButton>

                                <div className="flex-fill"></div>

                                <div
                                    className="flex-fill d-none d-lg-flex align-items-center justify-content-end gap-3">
                                    <IconButton onClick={() => {
                                        BucketService.TriggerUploadFile();
                                    }} icon={'cloud_upload'} isButton={true}
                                                staticClasses={'btn btn-outline-warning p-2 gap-2'}>
                                        <span>Upload File</span>
                                    </IconButton>
                                    
                                    <IconButton onClick={() => {
                                        (async () => {
                                            setCreatingFolder(true);
                                        })();
                                    }} icon={'folder'} isButton={true}
                                                staticClasses={'btn btn-outline-warning p-2 gap-2'}>
                                        <span>Create Folder</span>
                                    </IconButton>

                                    <IconButton onClick={() => {
                                        (async () => {
                                            const url = await APIWrapperService.GetBucketUrl(bucketId);
                                            if (url === null) return;
                                            await navigator.clipboard.writeText(url);
                                            ToastService.Add({
                                                title: 'Copied',
                                                type: 'success',
                                                message: 'Bucket URL copied to clipboard',
                                                duration: 3000,
                                            })
                                        })();
                                    }} icon={'link'} isButton={true}
                                                staticClasses={'btn btn-outline-warning p-2 gap-2'}>
                                        <span>Bucket URL</span>
                                    </IconButton>

                                    <IconButton onClick={BucketService.RefreshItems} icon={'refresh'} isButton={true}
                                                staticClasses={'btn btn-outline-warning p-2 gap-2'}>
                                        <span>Refresh Items</span>
                                    </IconButton>
                                </div>

                                <div className="d-block d-lg-none dropdown bg-dark">
                                    <button className="d-flex align-items-center justify-content-center gap-2 btn btn-outline-warning dropdown-toggle" type="button"
                                            id="dropdownMenu2" data-bs-toggle="dropdown" aria-expanded="false">
                                        <Icon name={'menu'} className={''} />
                                        Actions
                                    </button>
                                    <ul className="dropdown-menu bg-lighter text-white" aria-labelledby="dropdownMenu2">
                                        <li>
                                            <IconButton onClick={() => {
                                                (async () => {
                                                    setCreatingFolder(true);
                                                })();
                                            }} icon={'folder'} isButton={true}
                                                        staticClasses={'dropdown-item p-2 gap-2 text-white'}>
                                                <span>Create Folder</span>
                                            </IconButton>
                                        </li>
                                        <li>
                                            <IconButton onClick={() => {
                                                (async () => {
                                                    const url = await APIWrapperService.GetBucketUrl(bucketId);
                                                    if (url === null) return;
                                                    await navigator.clipboard.writeText(url);
                                                    ToastService.Add({
                                                        title: 'Copied',
                                                        type: 'success',
                                                        message: 'Bucket URL copied to clipboard',
                                                        duration: 3000,
                                                    })
                                                })();
                                            }} icon={'link'} isButton={true}
                                                        staticClasses={'dropdown-item p-2 gap-2 text-white'}
                                            >
                                                <span>Bucket URL</span>
                                            </IconButton>
                                        </li>
                                        <li>
                                            <IconButton onClick={BucketService.RefreshItems} icon={'refresh'} isButton={true}
                                                        staticClasses={'dropdown-item p-2 gap-2 text-white'}>
                                                <span>Refresh Items</span>
                                            </IconButton>
                                        </li>
                                    </ul>
                                </div>

                                {/*<IconButton icon={'settings'} filled={true} isButton={true}*/}
                                {/*            onClick={() => {*/}
                                {/*                */}
                                {/*            }}*/}
                                {/*            staticClasses={'btn btn-outline-warning p-2 gap-2'}>*/}
                                {/*    <span>Settings</span>*/}
                                {/*</IconButton>*/}
                            </div>
                        </div>

                        <div className="col-12 mb-3 d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-3 w-100">
                                <Icon name={'inventory_2'} className={'display-6 text-warning'}/>
                                <p className="my-0 d-block fs-2 fw-bolder">{bucketId}</p>
                                
                                <div className="flex-fill"></div>

                                
                                <IconButton isButton={true} icon={bookmarked ? 'bookmark_added' : 'bookmark'} filled={bookmarked} iconClasses={'fs-2'} staticClasses={'btn-ghost btn-ghost-warning fs-6'}
                                            onClick={() => {
                                                bookmarkType === 'bucket' ?
                                                    BucketService.ToggleBookmarkBucket(BucketService.currentBucket) :
                                                    BucketService.ToggleBookmarkPath(BucketService.currentBucket, BucketService.currentPath);
                                            }}>
                                    {/*<span className={'text-white fs-6'}>Bookmark{bookmarked ? 'ed' : ''} {bookmarkType}</span>*/}
                                </IconButton>
                                { bookmarkType !== 'bucket' && <IconButton isButton={true} icon={'home'} iconClasses={'fs-2'} staticClasses={'btn-ghost btn-ghost-warning fs-6'}
                                    onClick={() => console.log('home!')}>
                                    {/*<span className={'text-white fs-6'}>Root</span>*/}
                                </IconButton> }
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        <BucketItems bucketId={bucketId}/>
                    </div>
                </div>
            </UploadPane>
        </div>
    );
}
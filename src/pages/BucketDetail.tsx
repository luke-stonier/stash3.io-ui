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

export default function BucketDetail() {

    const navigate = useNavigate();
    const {bucketId} = useParams<{ bucketId: string }>();
    const [loading, setLoading] = useState<boolean>(false);
    const [, setItems] = useState<BucketObject[]>([]);
    const [creatingFolder, setCreatingFolder] = useState<boolean>(false);
    const [viewingItem, setViewingItem] = useState<string | null>(null);
    const [mediaViewerOpen, setMediaViewerOpen] = useState<boolean>(false);
    

    useEffect(() => {
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

        return () => {
            BucketService.previewItemEvent.unsubscribe(pie);
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
                                            onClick={() => navigate(-1)}>
                                    <span>All Buckets</span>
                                </IconButton>

                                <div className="flex-fill"></div>

                                <div
                                    className="flex-fill d-none d-lg-flex align-items-center justify-content-end gap-3">
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
                            <div className="d-flex align-items-center gap-3">
                                <Icon name={'inventory_2'} className={'display-6 text-warning'}/>
                                <p className="my-0 d-block fs-2 fw-bolder">{bucketId}</p>
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
import React, {useCallback} from "react";
import Icon from "./Icon";
import APIWrapperService from "../services/APIWrapperService";

export type CreateFolderModalProps = { onClose: () => void; bucket: string; currentPath: string }

export default function CreateFolderModal(props: CreateFolderModalProps) {

    const [loading, setLoading] = React.useState<boolean>(false);
    const [respError, setRespError] = React.useState<string | null>(null);
    const [folderName, setFolderName] = React.useState<string>('');
    
    const createFolder = useCallback(async () => {
        const folderCreateResp = await APIWrapperService.CreateFolder(props.bucket, folderName);
        if (!folderCreateResp.ok) {
            setRespError(`Failed to create folder. ${folderCreateResp.error}`);
        } else {
            props.onClose();
        }
    }, [folderName]);

    return <div onClick={props.onClose} className="position-absolute d-flex align-items-center justify-content-center"
                style={{top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)'}}>
        <div className="shadow-lg bg-dark rounded-3 p-3" style={{minWidth: 500, maxWidth: '90vw'}}
             onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-start">
                <div>
                    <p className="my-0 fs-4">Create Folder</p>
                    <p className="small my-0 text-muted">{props.bucket} : {props.currentPath || '/'}</p>
                </div>

                <div onClick={props.onClose} style={{cursor: 'pointer'}}><Icon name={'close'} className={'fs-4'}/></div>
            </div>

            <div className="mt-3 position-relative">
                {loading &&
                    <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                        style={{zIndex: 10}}>
                        <div className="spinner-border text-warning" style={{width: 90, height: 90}} role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                }
                <div>

                    <input type="text" placeholder="Folder Name"
                           className={`form-control mb-2 bg-lighter text-white border-0`}
                           value={folderName}
                           onChange={(e) => {
                               setFolderName(e.target.value)
                           }}/>
                </div>

                {respError !== null && respError.length > 0 &&
                    <div className="mt-3">
                        <div className="text-center text-danger">{respError}</div>
                    </div>}

                <div className="mt-3 d-flex align-items-center justify-content-between w-100">
                    <button className="me-auto ms-0 d-block btn btn-outline-warning" onClick={props.onClose}>Cancel</button>
                    <button className="ms-auto me-0 d-block btn btn-warning" onClick={createFolder}>Create</button>
                </div>
            </div>
        </div>
    </div>;
}
import Icon from "./Icon";
import React, {useCallback, useEffect} from "react";
import HttpService, {HttpError} from "../services/http/http-service";
import AwsAccount from "../Models/AwsAccount";
import APIWrapperService from "../services/APIWrapperService";

class AddAccountRequest {
    name: string = '';
    accessKey: string = '';
    secretKey: string = '';
}

class AddAccountResponse {
    userId: string;
    name: string;
    handle: string;
}

export type AddAccountModalProps = {
    editing?: boolean;
    onClose?: () => void;
    account?: AwsAccount
}
export default function AddAccountModal(props: AddAccountModalProps) {
    
    const [loading, setLoading] = React.useState<boolean>(false);
    const [respError, setRespError] = React.useState<string | null>(null);
    const [addAccountRequest, setAddAccountRequest] = React.useState<AddAccountRequest>(new AddAccountRequest());
    
    useEffect(() => {
        if (props.editing && props.account) {
            setAddAccountRequest({
                name: props.account.name,
                accessKey: props.account.awsAccessKey,
                secretKey: props.account.awsSecretKey,
            });
        }
    }, [props])
    
    const addAccountClickHandler = useCallback(() => {
        setLoading(true);
        HttpService.post(`/accounts`, {
            accountName: addAccountRequest.name,
        }, (resp: AddAccountResponse) => {
            APIWrapperService.SetCredentials(resp.handle, addAccountRequest.accessKey, addAccountRequest.secretKey);
            setTimeout(() => {
                setLoading(false);
                props.onClose && props.onClose();
            }, 250);
        }, (err: HttpError) => {
            setLoading(false);
            setRespError(err.error.error || 'An unknown error occurred');
        });
    }, [addAccountRequest, props]);
    
    const updateAccountClickHandler = useCallback(() => {
        if (!props.account) return;
        APIWrapperService.SetCredentials(props.account.handle, addAccountRequest.accessKey, addAccountRequest.secretKey);
        setTimeout(() => {
            setLoading(false);
            props.onClose && props.onClose();
        }, 250);
    }, [addAccountRequest, props])
    
    const deleteAccountClickHandler = useCallback(() => {
        if (!props) return;
        if (!props.account) return;
        if (!props.editing) return;
        
        const account = {...props.account};
        setLoading(true);
        HttpService.delete(`/accounts/${account.handle}`, (resp: {ok: boolean}) => {
            setLoading(false);
            if (resp.ok) {
                APIWrapperService.DeleteCredentials(account.handle);
                setTimeout(() => {
                    setLoading(false);
                    props.onClose && props.onClose();
                }, 250);
            } else {
                setRespError('Failed to delete account');
            }
        }, (err: HttpError) => {
            setLoading(false);
            setRespError(err.error.error || 'An unknown error occurred');
        });
    }, [props])

    return <div onClick={props.onClose} className="position-absolute d-flex align-items-center justify-content-center"
                style={{top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)'}}>
        <div className="shadow-lg bg-dark rounded-3 p-3" style={{minWidth: 500, maxWidth: '90vw'}}
             onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-start">
                <div>
                    <p className="my-0 fs-4">{props.editing ? 'Update' : 'Add' } AWS Account</p>
                    <p className="small my-0 text-muted">AWS credentials are only stored locally</p>
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

                    <input type="text" placeholder="Account Name"
                           disabled={props.editing}
                           className={`form-control mb-2 bg-lighter text-white border-0 ${props.editing ? 'opacity-50' : ''}`}
                           value={addAccountRequest.name}
                           onChange={(e) => {
                               setAddAccountRequest({...addAccountRequest, name: e.target.value})
                           }}/>

                    <input type="text" placeholder="Account Access Key"
                           className="form-control mb-2 bg-lighter text-white border-0"
                           value={addAccountRequest.accessKey}
                           onChange={(e) => {
                               setAddAccountRequest({...addAccountRequest, accessKey: e.target.value})
                           }}/>

                    <input type="text" placeholder="Account Secret"
                           className="form-control mb-2 bg-lighter text-white border-0"
                           value={addAccountRequest.secretKey}
                           onChange={(e) => {
                               setAddAccountRequest({...addAccountRequest, secretKey: e.target.value})
                           }}/>
                </div>

                {respError !== null && respError.length > 0 &&
                    <div className="mt-3">
                        <div className="text-center text-danger">{respError}</div>
                    </div>}

                <div className="mt-3 d-flex align-items-center justify-content-between w-100">
                    <button className="me-auto ms-0 d-block btn btn-outline-warning" onClick={props.onClose}>Cancel
                    </button>
                    <button className="ms-auto me-0 d-block btn btn-warning" onClick={props.editing ? updateAccountClickHandler : addAccountClickHandler}>{
                        props.editing ? 'Save' : 'Add Account'
                    }
                    </button>
                    {
                        props.editing &&
                        <button className="ms-3 me-0 d-block btn btn-outline-danger" onClick={deleteAccountClickHandler}>Delete
                        </button>
                    }
                </div>
            </div>
        </div>
    </div>;
}
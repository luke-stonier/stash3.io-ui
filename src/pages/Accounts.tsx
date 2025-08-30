import {useCallback, useEffect, useState} from "react";
import HttpService from "../services/http/http-service";
import {IconButton} from "../components/Button";
import AwsAccount from "../Models/AwsAccount";
import AddAccountModal from "../components/AddAccount";
import UserService from "../services/user-service";

export default function Accounts() {
    const [loading, setLoading] = useState<boolean>(true);
    const [accounts, setAccounts] = useState<AwsAccount[]>([]);
    const [addingAccount, setAddingAccount] = useState<boolean>(false);
    const [updatingAccount, setUpdatingAccount] = useState<AwsAccount | undefined>(undefined);

    const isSetupAccount = (a: AwsAccount) => {
        return a.awsAccessKey && a.awsSecretKey && a.awsAccessKey.length > 0 && a.awsSecretKey.length > 0
    }

    const addCredentialsToAccounts = useCallback((_accounts: AwsAccount[]) => {
        (async () => {
            const accountsWithCreds = await Promise.all(
                _accounts.map(async (a: AwsAccount) => {
                    const {accessKeyId, secretAccessKey} = await (window as any).api.getCreds(a.handle);
                    return {
                        ...a,
                        awsAccessKey: accessKeyId,
                        awsSecretKey: secretAccessKey,
                    };
                })
            );

            UserService.accountsUpdatedEvent.emit(accountsWithCreds);
            setAccounts(accountsWithCreds);
        })();
    }, []);

    const loadAccounts = useCallback(() => {
        setLoading(true);
        HttpService.get(`/accounts`, (resp: AwsAccount[]) => {
            setLoading(false);
            addCredentialsToAccounts(resp);
        }, () => {
            console.error('Failed to fetch accounts');
            setAccounts([]);
            setLoading(false);
        });
    }, [addCredentialsToAccounts])

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);


    const mask = (s?: string) =>
        !s ? "—" : `${s.slice(0, 1)}•••••${s.slice(-4)}`.toUpperCase();

    if (loading) {
        return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
            <div className="spinner-border text-warning" style={{width: 90, height: 90}} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    }

    return <div className="container-fluid px-0 d-flex flex-column align-items-stretch">
        <div className="row">
            <div className="col-6 col-sm-4">
                <IconButton icon={'add'} isButton={true} staticClasses={'btn btn-warning gap-1 justify-content-start'}
                            onClick={() => setAddingAccount(true)}>
                    <span>Add Account</span>
                </IconButton>
            </div>
        </div>

        {addingAccount && <div className="row">
            <AddAccountModal account={updatingAccount} editing={updatingAccount !== undefined} onClose={() => {
                setUpdatingAccount(undefined);
                setAddingAccount(false);
                loadAccounts();
            }}/>
        </div>
        }

        <div
            className={`row mt-3 flex-grow-1 flex-fill ${!accounts || accounts.length === 0 ? 'd-flex align-items-center justify-content-center' : 'd-flex flex-column'}`}>
            {(!accounts || accounts.length === 0) &&
                <p style={{userSelect: 'none'}} className="text-center my-0 display-5">No accounts.</p>
            }
            {accounts && accounts.length > 0 && accounts.map((account: AwsAccount, index: number) => {
                return <div key={`${account.id}_${index}`} className="col-12 h-auto">
                    <div onClick={() => {
                        setUpdatingAccount(account);
                        setAddingAccount(true);
                    }} style={{cursor: 'pointer'}}
                         className="rounded-3 bg-lighter overflow-hidden mb-3 h-auto px-3 py-3 d-flex align-items-start justify-content-between">
                        <div>
                            <p className="my-0 fs- lh-sm">{account.name}</p>
                            {
                                isSetupAccount(account) ? <>
                                        <table className="table text-white table-borderless px-0 text-start w-auto my-0">
                                            <tbody className="border-0 px-0">
                                            <tr className="px-0">
                                                <td className="ps-0 py-0">Access Key:</td>
                                                <td className="py-0">{mask(account.awsAccessKey)}</td>
                                            </tr>
                                            <tr className="border-0">
                                                <td className="ps-0 py-0">Secret Key:</td>
                                                <td className="py-0">{mask(account.awsSecretKey)}</td>
                                            </tr>
                                            </tbody>
                                        </table>
                                    </>
                                    :
                                    <>
                                        <p className="my-0 text-warning">No local credentials configured. Click to
                                            setup.</p>
                                    </>
                            }
                        </div>
                        <div>
                            <small className="text-muted">Created: {new Date(account.createdAt).toLocaleDateString()}</small>
                        </div>
                    </div>
                </div>
            })
            }
        </div>
    </div>;
}
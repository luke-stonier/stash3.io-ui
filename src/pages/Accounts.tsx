import {useCallback, useEffect, useState} from "react";
import HttpService from "../services/http/http-service";
import {IconButton} from "../components/Button";
import AwsAccount from "../Models/AwsAccount";
import AddAccountModal from "../components/AddAccount";
import UserService from "../services/user-service";
import Icon from "../components/Icon";

export default function Accounts() {
    const [user] = useState(UserService.GetCurrentUserSession()?.user);
    const [loading, setLoading] = useState<boolean>(true);
    const [accounts, setAccounts] = useState<AwsAccount[]>([]);
    const [addingAccount, setAddingAccount] = useState<boolean>(false);
    const [updatingAccount, setUpdatingAccount] = useState<AwsAccount | undefined>(undefined);
    const [hasBillingProfile, setHasBillingProfile] = useState<boolean>(false);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [, setError] = useState<string | null>(null);

    const isSetupAccount = (a: AwsAccount) => {
        return a.awsAccessKey && a.awsSecretKey && a.awsAccessKey.length > 0 && a.awsSecretKey.length > 0
    }

    const addCredentialsToAccounts = useCallback((_accounts: AwsAccount[]) => {
        if (user === undefined) { setAccounts([]); return; }

        (async () => {
            const accountsWithCreds = await Promise.all(
                _accounts.map(async (a: AwsAccount) => {
                    const {accessKeyId, secretAccessKey} = await (window as any).api.getCreds(user.id, a.handle);
                    return {
                        ...a,
                        email: user.email,
                        awsAccessKey: accessKeyId,
                        awsSecretKey: secretAccessKey,
                        
                        icon: a.type === 'S3' ? <Icon name={'deployed_code'} /> : <Icon name={'cloud'} />,
                    };
                })
            );

            UserService.accountsUpdatedEvent.emit(accountsWithCreds);
            setAccounts(accountsWithCreds);
        })();
    }, []);

    const loadBilling = useCallback(() => {
        setLoading(true);
        HttpService.get(`/billing`, (resp: any) => {
            if (JSON.stringify(resp) === "" || Object.keys(resp).length === 0) {
                setHasBillingProfile(false);
                setBillingInfo(null);
            } else {
                setHasBillingProfile(true);
                setBillingInfo(resp);
            }
            setLoading(false);
        }, (err: any) => {
            console.error('Failed to fetch billing information', err);
            setError("Failed to fetch billing information");
            setBillingInfo(null);
            setLoading(false);
        });
    }, [])

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
        loadBilling();
        loadAccounts();
    }, [loadBilling, loadAccounts]);


    const mask = (s?: string) =>
        !s ? "—" : `${s.slice(0, 1)}•••••${s.slice(-4)}`.toUpperCase();

    const canAddAccount = hasBillingProfile && (
        (billingInfo && billingInfo.currentPeriodEnd && new Date(billingInfo.currentPeriodEnd) > new Date()) &&
        (billingInfo.planName === 'personal' && accounts.length < 1)
    );
    
    const unableToAddAccountReason = !hasBillingProfile ? "You must set up a billing profile before adding an AWS account." :
        (billingInfo && billingInfo.currentPeriodEnd && new Date(billingInfo.currentPeriodEnd) <= new Date()) ?
            "Your billing profile is expired. Please update your billing information to add more AWS accounts." :
            (billingInfo.planName === 'personal' && accounts.length >= 1) ?
                "Your current plan only allows one AWS account. Please upgrade your plan to add more accounts." :
                "";
    
    if (loading) {
        return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
            <div className="spinner-border text-warning" style={{width: 90, height: 90}} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    }

    return <div className="container-fluid px-0 d-flex flex-column align-items-stretch">
        <div className="row">
            <div className="col-12">
                <h1 className="mb-0">AWS Accounts</h1>
                <p className="text-muted">Manage your AWS accounts. <span className="small fst-italic">Account keys are only stored and used locally.</span></p>
            </div>
        </div>
        <div className="row">
            <div className="col-6 col-sm-4">
                <IconButton disabled={!canAddAccount} icon={'add'} isButton={true} staticClasses={'btn btn-outline-warning gap-1 justify-content-start'}
                            onClick={() => setAddingAccount(true)}>
                    <span>Add Account</span>
                </IconButton>
            </div>
            <div className="col-12">
                {!canAddAccount && <p className={'mt-2 mb-0'}>{unableToAddAccountReason}</p>}
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
                         className="rounded-3 bg-lighter overflow-hidden mb-3 h-auto px-3 py-3 d-flex align-items-stretch justify-content-between">
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
                        <div className={''}>
                            <small style={{ userSelect: 'none' }} className="text-muted">Created: {new Date(account.createdAt).toLocaleDateString()}</small>
                            <div className={'flex-fill d-flex align-items-center justify-content-end h-100'}>
                                {account.icon || <Icon name={'disabled_by_default'} />}
                            </div>
                        </div>
                    </div>
                </div>
            })
            }
        </div>
    </div>;
}
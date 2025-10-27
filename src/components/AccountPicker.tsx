import {useCallback, useEffect, useState} from "react";
import AwsAccount from "../Models/AwsAccount";
import HttpService from "../services/http/http-service";
import UserService from "../services/user-service";
import {useNavigate} from "react-router-dom";
import {ToastService} from "../services/Overlays";
import APIWrapperService from "../services/APIWrapperService";

export default function AccountPicker() {
    
    const navigate = useNavigate();
    const [user] = useState(UserService.GetCurrentUserSession()?.user);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedAccount, setSelectedAccount] = useState<AwsAccount | null>(UserService.GetAWSAccount());
    const [accounts, setAccounts] = useState<AwsAccount[]>([]);
    
    const isSetupAccount = (a: AwsAccount) => {
        return a.awsAccessKey && a.awsSecretKey && a.awsAccessKey.length > 0 && a.awsSecretKey.length > 0
    }

    const selectAccount = useCallback((account: AwsAccount) => {
        UserService.UpdateAWSAccount(account);
        setSelectedAccount(account);
        navigate('/buckets');
        ToastService.Add({
            id: 'account-switched',
            title: 'Account switched',
            message: `Switched to account ${account.name} (${account.handle})`,
            type: 'info',
            duration: 3000
        })
    }, [navigate]);

    const addCredentialsToAccounts = useCallback((_accounts: AwsAccount[]) => {
        if (user === undefined) { setAccounts([]); return; }
        
        (async () => {
            const builtAccounts = await Promise.all(
                _accounts.map(async (a: AwsAccount) => {
                    const { accessKeyId, secretAccessKey } = await APIWrapperService.GetCredentials(user.id, a.handle)
                    return {
                        ...a,
                        awsAccessKey: accessKeyId,
                        awsSecretKey: secretAccessKey,
                    };
                })
            );

            setAccounts(builtAccounts);
            const accountsWithCreds = builtAccounts.filter(a => isSetupAccount(a));
            if (accountsWithCreds.length > 0 && !selectedAccount) {
                selectAccount(accountsWithCreds[0]);
            }
        })();
    }, [selectedAccount, selectAccount]);

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
        const aue = UserService.accountsUpdatedEvent.subscribe((accounts) => {
           loadAccounts(); 
        });
        
        loadAccounts();
        return () => {
            UserService.accountsUpdatedEvent.unsubscribe(aue);
        }
    }, [loadAccounts]);
    
    return <select
        defaultValue={accounts.length === 0 ? '__N/A__' : selectedAccount?.id}
        onChange={(e) => {
            const account = accounts.find(a => a.id === e.target.value);
            if (account) selectAccount(account);
        }}
        disabled={loading || accounts.length === 0}    
        style={{ maxWidth: 300}}
        className="ms-auto me-0 form-select bg-lighter border-warning text-white"
        aria-label="Account Selector">
        { accounts.length === 0 && <option value={'__N/A__'}>Select an AWS account</option> }
        {accounts.map((a) => <option key={a.id} disabled={!isSetupAccount(a)} value={a.id}>{a.name} ({a.handle})</option>)}
    </select>;
}
import {useEffect} from "react";
import HttpService from "./http/http-service";
import {STASH_VERSION} from "../App";
import { ConfirmationService } from "./Overlays";

export default function VersionChecker() {

    useEffect(() => {
        HttpService.get('/version', (res: { version: string, releaseDate: Date }) => {
            if (res.version === 'LOCAL') return;

            if (res.version === STASH_VERSION) return;

            ConfirmationService.Add({
                title: 'New Version Available!',
                children: <div style={{ maxWidth: 450, marginBottom: 40 }}>
                    <p>A new version of Stash3.io is available.</p>
                    <p className={'my-0'}>Current version: {STASH_VERSION}</p>
                    <p>Latest version: {res.version} (released {new Date(res.releaseDate).toLocaleDateString()})</p>
                    
                    <p>Press confirm to download the latest version.</p>
                    <span>You can continue to use the current version, but may be missing out on some great new features!</span>
                </div>,
                onClose: (status: boolean) => {
                    if (!status) return;
                    window.location.reload();
                },
                cancelColor: 'outline-warning',
                confirmColor: 'success'
            })
        }, () => {
        })
    }, []);
    
    return <></>;
}
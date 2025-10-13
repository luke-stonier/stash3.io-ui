import Icon from "../components/Icon";
import React, {useState} from "react";
import ChangePassword from "../components/ChangePassword";

export default function UserAccountPage() {
    
    const [session, setSession] = useState<any>(null);
    
    return <div className="">
        <div className="d-flex align-items-center justify-content-start gap-2 w-100 mb-3">
            <Icon name={'account_circle'} className={'text-secondary'} style={{fontSize: '3rem'}}/>
            <h1 className="mb-0">Account</h1>
        </div>
        
        <div>
            
        </div>
        
        <ChangePassword />
        
    </div>;
}
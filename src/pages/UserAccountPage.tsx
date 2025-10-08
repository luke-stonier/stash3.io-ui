import Icon from "../components/Icon";
import React from "react";

export default function UserAccountPage() {
    return <div className="pt-5 d-flex flex-column align-items-center justify-content-center h-100">
        <Icon name={'account_circle'} className={'text-secondary'} style={{fontSize: '6rem'}}/>
        <h3 className="text-secondary">No account options</h3>
        <p className="text-secondary text-center">Come back later to view your account details</p>
    </div>;
}
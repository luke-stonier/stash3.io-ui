import Icon from "../components/Icon";
import React from "react";

export default function BillingPage() {
    return <div className="pt-5 d-flex flex-column align-items-center justify-content-center h-100">
        <Icon name={'sell'} className={'text-secondary'} style={{fontSize: '6rem'}}/>
        <h3 className="text-secondary">No billing options</h3>
        <p className="text-secondary text-center">Come back later to view your billing details</p>
        
        
        <div className="mt-5">
            <h3 className="mb-3">Available Licenses</h3>
            <div>
                <p className="my-0">Personal (Perpetual) £59</p>
                <small>All Features - built for solo users with a single set of AWS credentials at one time</small>
            </div>
            
            <div className="mt-3">
                <p className="my-0">Professional (Monthly) £12/mo or £120/year</p>
                <small>All Features - Multiple AWS credentials at one time</small>
            </div>
        </div>
    </div>;
}
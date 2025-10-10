import Icon from "../components/Icon";
import React, {useCallback, useEffect, useState} from "react";
import HttpService from "../services/http/http-service";

export default function BillingPage() {

    const [loading, setLoading] = useState<boolean>(true);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [hasBillingProfile, setHasBillingProfile] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // 
    
    const billingPlans = [
        { name: "Personal (Perpetual)", price: "£59", description: "All Features - built for solo users with a single set of AWS credentials at one time", id: "personal" },
        { name: "Professional (Monthly)", price: "£12/month", description: "All Features - Multiple AWS credentials at one time", id: "professional" },
        { name: "Professional (Annually)", price: "£100/year", description: "All Features - Multiple AWS credentials at one time", id: "professional_annual" },
    ];
    
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
        }, () => {
            console.error('Failed to fetch billing information');
            setError("Failed to fetch billing information");
            setBillingInfo(null);
            setLoading(false);
        });
    }, [])
    
    useEffect(() => {
        loadBilling();
    }, [])

    if (loading) {
        return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
            <div className="spinner-border text-warning" style={{width: 90, height: 90}} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>;
    }
    
    if (error !== null) {
        return <div className="pt-5 d-flex flex-column align-items-center justify-content-center h-100">
            <Icon name={'error'} className={'text-danger'} style={{fontSize: '6rem'}}/>
            <div className="mt-3">
                <p className="text-danger">Error: {error}</p>
            </div>
        </div>;
    }
    
    const PlanPurchaseOptions = () => {
        
        return <div className="mt-5">
            <h3 className="mb-3">Available Licenses</h3>
            <div>
                {billingPlans.map(plan => (
                    <div key={plan.id} className="mb-4 p-3 border rounded">
                        <h5 className="mb-1">{plan.name} - {plan.price}</h5>
                        <p className="mb-2"><small>{plan.description}</small></p>
                        <button className="btn btn-primary" onClick={() => {
                            
                        }}>Purchase {plan.name}</button>
                    </div>
                ))}
            </div>
        </div>;
    }
    
    return <div className="pt-5 d-flex flex-column align-items-center justify-content-center h-100">
        {/*<Icon name={'sell'} className={'text-secondary'} style={{fontSize: '6rem'}}/>*/}


        {PlanPurchaseOptions()}
        
        {/*<div className="mt-5">*/}
        {/*    <h3 className="mb-3">Available Licenses</h3>*/}
        {/*    <div>*/}
        {/*        <p className="my-0">Personal (Perpetual) £59</p>*/}
        {/*        <small>All Features - built for solo users with a single set of AWS credentials at one time</small>*/}
        {/*    </div>*/}
        {/*    */}
        {/*    <div className="mt-3">*/}
        {/*        <p className="my-0">Professional (Monthly) £12/mo or £120/year</p>*/}
        {/*        <small>All Features - Multiple AWS credentials at one time</small>*/}
        {/*    </div>*/}
        {/*</div>*/}
    </div>;
}
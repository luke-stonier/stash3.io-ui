import Icon from "../components/Icon";
import React, {useCallback, useEffect, useState} from "react";
import HttpService from "../services/http/http-service";
import UserService from "../services/user-service";

export default function BillingPage() {

    //const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(true);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [hasBillingProfile, setHasBillingProfile] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [, setCheckoutSession] = useState<any>(null);

    // 

    const billingPlans = [
        {
            name: "Personal (Perpetual)",
            price: "£59",
            description: "All Features - built for solo users with a single set of AWS credentials at one time",
            id: "personal"
        },
        {
            name: "Professional (Monthly)",
            price: "£12.99/month",
            description: "All Features - Multiple AWS credentials at one time",
            id: "professional"
        },
        {
            name: "Professional (Annually)",
            price: "£129/year",
            description: "All Features - Multiple AWS credentials at one time",
            id: "professional_annual"
        },
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
        }, (err: any) => {
            console.error('Failed to fetch billing information', err);
            setError("Failed to fetch billing information");
            setBillingInfo(null);
            setLoading(false);
        });
    }, [])

    useEffect(() => {
        loadBilling();
    }, [loadBilling])

    const checkoutWithPlan = ({name, id}: { name: string, id: string }) => {
        const userId = UserService.currentSession?.user.id;
        if (!userId) {
            setError("User not logged in");
            return;
        }

        setLoading(true);
        HttpService.post(`/stripe/checkout/sessions`, {
            origin: window.location.origin,
            tier: id,
            accountId: userId
        }, (resp: any) => {
            try {
                setCheckoutSession(resp);
                const checkoutWindow = window.open(resp.url, "_blank");
                if (!checkoutWindow) {
                    setError("Failed to open checkout window. Please contact support if this continues");
                } else {
                    setError(null);
                    const poll = setInterval(() => {
                        if (checkoutWindow.closed) {
                            clearInterval(poll);
                            setLoading(true);
                            setTimeout(() => loadBilling(), 1000);
                        }
                    }, 500);
                }
            } catch (e) {
                setError("Failed to initiate checkout");
                console.error(e);
            }
            setLoading(false);
        }, (err: any) => {
            try {
                console.error('Failed to initiate checkout', err);
                setError(err && err.error && err.error.error ? err.error.error : "Failed to initiate checkout");
            } catch (e) {
                setError("Failed to initiate checkout");
                console.error(e);
            }
            setLoading(false);
        });
    }
    
    const openCustomerPortal = () => {
        setLoading(true);
        HttpService.get(`/stripe/portal`, (resp: any) => {
            const portalWindow = window.open(resp.url, "_blank");
            if (!portalWindow) {
                setError("Failed to open customer portal. Please contact support if this continues");
            } else {
                const poll = setInterval(() => {
                    if (portalWindow.closed) {
                        clearInterval(poll);
                        setLoading(true);
                        setTimeout(() => loadBilling(), 1000);
                    }
                }, 500);
            }
            setLoading(false);
        }, () => {
            setLoading(false);
        });   
    }

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

            <div>
                <button className="btn btn-secondary" onClick={() => {
                    setError(null);
                    loadBilling();
                }}>Retry
                </button>
            </div>
        </div>;
    }

    const PlanPurchaseOptions = () => {

        return <div className="mt-5 w-100">
            <h3 className="mb-0">Available Licenses</h3>
            <small className="mb-3 d-block">Looking for a multi-user business plan? Contact us <a className="text-warning fst-italic text-decoration-none" href="mailto:sales@stash3.io">sales@stash3.io</a></small>
            <div className="w-100 d-flex flex-column align-items-center justify-content-center h-100">
                {billingPlans.map(plan => {                    
                    if (plan.id === 'personal' && hasBillingProfile && billingInfo && billingInfo.hasPurchasedPerpetual) {
                        return <div key={plan.id} className="mb-4 p-3 border rounded w-100 opacity-25">
                            <h5 className="mb-1 text-muted">{plan.name}</h5>
                            <p className="mb-2 text-muted"><small>{plan.description}</small></p>
                            <button disabled className="btn btn-outline-primary" onClick={() => {
                            }}>ALREADY PURCHASED</button>
                        </div>    
                    }

                    if (hasBillingProfile && billingInfo && billingInfo.status === 'active' && billingInfo.planName === plan.id) {
                        return null;
                    }

                    return <div key={plan.id} className="mb-4 p-3 border rounded w-100">
                        <h5 className="mb-1">{plan.name} - {plan.price}</h5>
                        <p className="mb-2"><small>{plan.description}</small></p>
                        <button className="btn btn-primary" onClick={() => {
                            checkoutWithPlan(plan);
                        }}>{hasBillingProfile ? 'Update To' : 'Purchase'} {plan.name}</button>
                    </div>
                })}
            </div>

            <small className="fst-italic text-muted mb-3 d-block">Upgrading to professional plans after purchasing a personal perpetual license does not remove your personal plan history - cancel your subscription at any time to continue enjoying your standard benefits!</small>
        </div>;
    }

    const PlanDetails = () => {
        if (!billingInfo) return null;
        return <div className="mt-4 border rounded-3 px-3 py-2 shadow-lg bg-lighter">
            <h3 className="mb-3">Current Plan Details</h3>
            <p className="mb-1">Plan Name: <strong>{billingInfo.planName}</strong></p>
            <p className="mb-1">Status: <strong>{billingInfo.status}</strong></p>
            <p className="mb-1">Updated Date: <strong>{new Date(billingInfo.lastUpdatedDate).toLocaleDateString()}</strong></p>
            <p className="mb-1">Start Date: <strong>{new Date(billingInfo.startDate).toLocaleDateString()}</strong></p>
            {billingInfo.endDate &&
                <p className="mb-1">End Date: <strong>{new Date(billingInfo.endDate).toLocaleDateString()}</strong></p>
            }
            {billingInfo.isSubscription !== undefined &&
                <p className="mb-1">Type: <strong>{billingInfo.isSubscription ? 'Subscription' : 'One-time Purchase'}</strong></p>
            }
        </div>
    }

    return <div className="d-flex flex-column align-items-center justify-content-start h-100">
        <div className="d-flex align-items-center justify-content-start gap-2 w-100 mb-3">
        <Icon name={'sell'} className={'text-secondary'} style={{fontSize: '3rem'}}/>
        <h1 className="mb-0">Billing</h1>
        </div>

        <div className="w-100">
            {!hasBillingProfile &&
                <p className="text-center">You do not have an active billing plan. Please select a plan below to get
                    started.</p>}
            {hasBillingProfile && billingInfo && PlanDetails()}
            {hasBillingProfile && <button className="btn btn-primary mt-3" onClick={openCustomerPortal}>Manage Subscription</button> }

            {PlanPurchaseOptions()}
        </div>
    </div>;
}
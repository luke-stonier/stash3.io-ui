import {Link, useNavigate} from "react-router-dom";
import logo from "../assets/images/stash3_logo.png";
import React, {useCallback, useState} from "react";
import HttpService, {HttpError} from "../services/http/http-service";
import UserSession from "../Models/UserSession";

export default function ForgotPassword() {

    const navigate = useNavigate();
    const [respError, setRespError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [forgotRequest, setForgotRequest] = useState<{
        email: string;
    }>({
        email: ''
    })

    const submitClickHandler = useCallback(() => {
        setLoading(true);
        setRespError(null);
        HttpService.post(`/auth/forgot-password`, forgotRequest, (resp: UserSession) => {
            setLoading(false);
            setForgotRequest({
                email: '',
            });
            navigate('/reset-password');
        }, (err: HttpError) => {
            console.log(err);
            setLoading(false);
            setRespError(err && err.error && err.error.error ? err.error.error : 'An unknown error occurred');
        });
    }, [forgotRequest, navigate]);

    const errors = useCallback(() => {
        const _errors: { visible: boolean, message: string }[] = [];

        if (!forgotRequest.email || forgotRequest.email.length === 0) {
            _errors.push({visible: false, message: 'Email is required'});
        }

        return _errors;
    }, [forgotRequest])

    return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
        <img
            src={logo}
            alt="logo"
            className="img-fluid d-block"
            style={{height: "2.25rem"}}
        />
        <h1 className="h3 mb-0 fw-bold">Stash3.io</h1>

        <h1 className="display-1">Forgot Password</h1>

        <div className="mt-3">
            <input type="email" placeholder="Email" className="form-control mb-2 bg-lighter text-white border-0"
                   style={{width: '300px'}}
                   onChange={(e) => {
                       setForgotRequest({...forgotRequest, email: e.target.value})
                   }}
                   onKeyDown={((e) => {
                       if (e.key === 'Enter') submitClickHandler()
                   })}/>
            <button className={`btn btn-primary w-100 ${loading ? 'opacity-50' : ''}`}
                    disabled={loading || errors().length > 0}
                    onClick={submitClickHandler}>{loading ? 'Loading...' : 'Continue'}</button>
        </div>

        {
            errors().filter(e => e.visible).length > 0 && <div className="mt-3 text-start" style={{width: '300px'}}>
                {errors().filter(e => e.visible).map((err, idx) => <div key={idx}
                                                                        className="text-center text-danger">{err.message}</div>)}
            </div>
        }

        {
            respError !== null && <div className="mt-3 text-start" style={{width: '300px'}}>
                <div className="text-center text-danger">{respError}</div>
            </div>
        }
        
        <p className="mt-3 mb-2 text-muted"><Link className="text-white ms-1" to={'/login'}>Login</Link></p>
        <p className="mt-0 text-muted"><Link className="text-white ms-1" to={'/reset-password'}>Reset password</Link></p>
    </div>
}
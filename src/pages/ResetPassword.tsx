import {Link, useNavigate} from "react-router-dom";
import logo from "../assets/images/stash3_logo.png";
import React, {useCallback, useState} from "react";
import HttpService, {HttpError} from "../services/http/http-service";
import UserSession from "../Models/UserSession";

export default function ResetPassword() {

    const navigate = useNavigate();
    const [respError, setRespError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [forgotRequest, setForgotRequest] = useState<{
        token: string;
        password: string;
        passwordRepeat: string;
    }>({
        token: '',
        password: '',
        passwordRepeat: ''
    })

    const submitClickHandler = useCallback(() => {
        setLoading(true);
        setRespError(null);
        HttpService.post(`/auth/reset-password`, forgotRequest, (resp: UserSession) => {
            setLoading(false);
            setForgotRequest({
                token: '',
                password: '',
                passwordRepeat: ''
            });
            navigate('/login');
        }, (err: HttpError) => {
            console.log(err);
            setLoading(false);
            setRespError(err && err.error && err.error.error ? err.error.error : 'An unknown error occurred');
        });
    }, [forgotRequest, navigate])

    const errors = useCallback(() => {
        const _errors: { visible: boolean, message: string }[] = [];

        if (!forgotRequest.token || forgotRequest.token.length === 0) {
            _errors.push({visible: false, message: 'Code is required'});
        }

        if (!forgotRequest.password || forgotRequest.password.length === 0) {
            _errors.push({visible: false, message: 'Password is required'});
        }

        if (!forgotRequest.passwordRepeat || forgotRequest.passwordRepeat.length === 0) {
            _errors.push({visible: false, message: 'Password Repeat is required'});
        }

        if (forgotRequest.passwordRepeat !== forgotRequest.password) {
            _errors.push({visible: false, message: 'Passwords dont match'});
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

        <h1 className="display-1">Reset Password</h1>

        <div className="mt-3">
            <input type="text" placeholder="Code (From Email)" className="form-control mb-2 bg-lighter text-white border-0"
                   style={{width: '300px'}}
                   onChange={(e) => {
                       setForgotRequest({...forgotRequest, token: e.target.value})
                   }}
                   onKeyDown={((e) => {
                       if (e.key === 'Enter') submitClickHandler()
                   })}/>
            <input type="password" placeholder="Password" className="form-control mb-2 bg-lighter text-white border-0"
                   style={{width: '300px'}}
                   onChange={(e) => {
                       setForgotRequest({...forgotRequest, password: e.target.value})
                   }}
                   onKeyDown={((e) => {
                       if (e.key === 'Enter') submitClickHandler()
                   })}
            />
            <input type="password" placeholder="Password Repeat" className="form-control mb-2 bg-lighter text-white border-0"
                   style={{width: '300px'}}
                   onChange={(e) => {
                       setForgotRequest({...forgotRequest, passwordRepeat: e.target.value})
                   }}
                   onKeyDown={((e) => {
                       if (e.key === 'Enter') submitClickHandler()
                   })}
            />
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

        <p className="mt-3 mb-2 text-muted"><Link className="text-white ms-1" to={'/login'}>Back</Link></p>
    </div>
}
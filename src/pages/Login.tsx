import {Link} from "react-router-dom";
import logo from "../assets/images/stash3_logo.png";
import React, {useCallback, useState} from "react";
import HttpService, {HttpError} from "../services/http/http-service";
import UserService from "../services/user-service";
import UserSession from "../Models/UserSession";

export default function Login() {

    const [respError, setRespError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loginRequest, setLoginRequest] = useState<{
        email: string;
        password: string;
    }>({
        email: '',
        password: ''
    })

    const loginClickHandler = useCallback(() => {
        setLoading(true);
        setRespError(null);
        HttpService.post(`/auth/login`, loginRequest, (resp: UserSession) => {
            setLoading(false);
            setLoginRequest({
                email: '',
                password: ''
            });
            UserService.UpdateSession(resp);
        }, (err: HttpError) => {
            setLoading(false);
            setRespError(err.error.error || 'An unknown error occurred');
        });
    }, [loginRequest])

    const errors = useCallback(() => {
        const _errors: { visible: boolean, message: string }[] = [];

        if (!loginRequest.email || loginRequest.email.length === 0) {
            _errors.push({visible: false, message: 'Email is required'});
        }

        if (!loginRequest.password || loginRequest.password.length === 0) {
            _errors.push({visible: false, message: 'Password is required'});
        }

        return _errors;
    }, [loginRequest])

    return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
        <img
            src={logo}
            alt="logo"
            className="img-fluid d-block"
            style={{height: "2.25rem"}}
        />
        <h1 className="h3 mb-0 fw-bold">Stash3.io</h1>

        <h1 className="display-1">Login</h1>

        <div className="mt-3">
            <input type="email" placeholder="Email" className="form-control mb-2 bg-lighter text-white border-0"
                   style={{width: '300px'}}
                   onChange={(e) => {
                       setLoginRequest({...loginRequest, email: e.target.value})
                   }}/>
            <input type="password" placeholder="Password" className="form-control mb-2 bg-lighter text-white border-0"
                   style={{width: '300px'}}
                   onChange={(e) => {
                       setLoginRequest({
                           ...loginRequest,
                           password: e.target.value
                       })
                   }}/>
            <button className={`btn btn-primary w-100 ${loading ? 'opacity-50' : ''}`}
                    disabled={loading || errors().length > 0}
                    onClick={loginClickHandler}>{loading ? 'Loading...' : 'Log In'}</button>
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

        <p className="mt-3 text-muted">Dont have an account? <Link className="text-white ms-1" to={'/register'}>Sign up
            here</Link></p>
    </div>
}
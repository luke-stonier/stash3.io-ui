import {Link, useNavigate} from "react-router-dom";
import React, {useCallback, useState} from "react";
import HttpService, {HttpError} from "../services/http/http-service";
import logo from "../assets/images/stash3_logo.png";
import UserService from "../services/user-service";
import UserSession from "../Models/UserSession";

export default function Register() {

    const navigate = useNavigate();
    const [respError, setRespError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [registerRequest, setRegisterRequest] = useState<{
        email: string;
        password: string;
        passwordRepeat: string;
    }>({
        email: '',
        password: '',
        passwordRepeat: ''
    })

    const registerClickHandler = useCallback(() => {
        setLoading(true);
        setRespError(null);
        HttpService.post(`/auth/register`, registerRequest, (resp: UserSession) => {
            setLoading(false);
            setRegisterRequest({
                email: '',
                password: '',
                passwordRepeat: ''
            });
            UserService.UpdateSession(resp);
            navigate('/');
        }, (err: HttpError) => {
            setLoading(false);
            setRespError(err && err.error && err.error.error ? err.error.error : 'An unknown error occurred');
        });
    }, [registerRequest])

    const errors = useCallback(() => {
        const _errors: { visible: boolean, message: string }[] = [];

        if (!registerRequest.email || registerRequest.email.length === 0) {
            _errors.push({visible: false, message: 'Email is required'});
        }

        if (!registerRequest.password || registerRequest.password.length === 0) {
            _errors.push({visible: false, message: 'Password is required'});
        }

        if (!registerRequest.passwordRepeat || registerRequest.passwordRepeat.length === 0) {
            _errors.push({visible: false, message: 'Repeat Password is required'});
        }


        if (registerRequest.passwordRepeat && registerRequest.passwordRepeat.length > 0 &&
            registerRequest.password && registerRequest.password.length > 0) {
            if (registerRequest.password !== registerRequest.passwordRepeat) {
                _errors.push({visible: true, message: 'Passwords do not match'});
            }
        }

        return _errors;
    }, [registerRequest])

    return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">

        <img
            src={logo}
            alt="logo"
            className="img-fluid d-block"
            style={{height: "2.25rem"}}
        />
        <h1 className="h3 mb-0 fw-bold">Stash3.io</h1>
        <h1 className="display-1">Register</h1>

        <div className="mt-3">
            <input disabled={loading} value={registerRequest.email} type="email" placeholder="Email"
                   className="form-control mb-2 bg-lighter text-white border-0" style={{width: '300px'}}
                   onChange={(e) => {
                       setRegisterRequest({
                           ...registerRequest,
                           email: e.target.value
                       })
                   }}/>
            <input disabled={loading} value={registerRequest.password} type="password" placeholder="Password"
                   className="form-control mb-2 bg-lighter text-white border-0" style={{width: '300px'}}
                   onChange={(e) => {
                       setRegisterRequest({
                           ...registerRequest,
                           password: e.target.value
                       })
                   }}
            />
            <input disabled={loading} value={registerRequest.passwordRepeat} type="password"
                   placeholder="Password Repeat"
                   className="form-control mb-2 bg-lighter text-white border-0" style={{width: '300px'}}
                   onChange={(e) => {
                       setRegisterRequest({
                           ...registerRequest,
                           passwordRepeat: e.target.value
                       })}}
                   onKeyDown={((e) => {
                       if (e.key === 'Enter') registerClickHandler()
                   })}
            />
            <button className={`btn btn-primary w-100 ${loading ? 'opacity-50' : ''}`}
                    disabled={loading || errors().length > 0}
                    onClick={registerClickHandler}>{loading ? 'Loading...' : 'Sign Up'}</button>
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

        <p className="mt-3 text-muted">Already have an account? <Link className="text-white ms-1" to={'/login'}>Log in
            here</Link></p>
    </div>
}
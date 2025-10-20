import React, {useEffect, useState} from 'react';
import './App.css';
import './assets/bootstrap.css';
import {HashRouter, Route, Routes, Navigate} from "react-router-dom";
import AppContainer from "./pages/AppContainer";
import ErrorPage from "./pages/ErrorPage";
import BucketDetail from "./pages/BucketDetail";
import Register from './pages/Register';
import Login from "./pages/Login";
import UserService from "./services/user-service";
import Buckets from "./pages/Buckets";
import Accounts from "./pages/Accounts";
import  { ConfirmationDialogWrapper, ToastWrapper } from "./services/Overlays";
import Bookmarks from "./pages/Bookmarks";
import UserAccountPage from "./pages/UserAccountPage";
import BillingPage from "./pages/BillingPage";
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VersionChecker from './services/VersionChecker';
import APIWrapperService from "./services/APIWrapperService";
import Icon from "./components/Icon";

export const STASH_VERSION = '0.0.1';

function App() {
    const [loaded, setLoaded] = useState(false);
    const [failedToLoad, setFailedToLoad] = useState(false);
    const [authenticated, setAuthenticated] = useState(UserService.isLoggedIn());
    const [initialRoute, setInitialRoute] = useState('');
    
    useEffect(() => {
        const see = UserService.sessionExpiredEvent.subscribe(() => {
            console.log("Session expired, logging out...");
            setAuthenticated(false);
            window.location.href = initialRoute;
        });
        const sue = UserService.sessionUpdatedEvent.subscribe((session) => {
            console.log("Session updated...", session);
            setAuthenticated(session != null);
        });

        return () => {
            UserService.sessionExpiredEvent.unsubscribe(see);
            UserService.sessionUpdatedEvent.unsubscribe(sue);
        }
    }, [initialRoute])

    useEffect(() => {
        if (!authenticated) {
            localStorage.removeItem("token");
        }
    }, [authenticated]);

    useEffect(() => {
        
        // ensure ipc is configured
        const safeToLoad = APIWrapperService.IPCConfigure();
        setLoaded(safeToLoad);
        setFailedToLoad(!safeToLoad);
        //
        
        const route = window.location.href;
        if (route) {
            setInitialRoute(route);
        }
    }, []);
    
    if (failedToLoad) {
        return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
            <Icon name={'gpp_bad'} className={'text-danger text-center display-1 mb-3'}/>
            <h3 className="text-danger">Failed to load application.</h3>
            <p className={'mb-1'}>Please restart the application. If the issue persists, contact support.</p>
            <p className="fst-italic small">This can happen if the app is being run outside of the designated runtime.</p>
        </div>
    }
    
    if (!loaded) {
        return <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
            <div className="spinner-border text-warning" style={{width: 90, height: 90}} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    }
    
    return <div className="w-100 text-white position-relative">
        {/* VERSION CHECK*/}
        <VersionChecker />

        {/* Global Modals */}
        <ToastWrapper />
        <ConfirmationDialogWrapper />
        
        <HashRouter>
            <Routes>
                {
                    authenticated ?
                        <Route element={<AppContainer/>}>
                            <Route index element={<Navigate to={'/buckets'}/>}/>
                            <Route path="/" element={<Navigate to={'/buckets'}/>}/>
                            <Route path="accounts" element={<Accounts/>}/>
                            <Route path="buckets" element={<Buckets/>}/>
                            <Route path="buckets/:bucketId" element={<BucketDetail/>}/>
                            <Route path="bookmarks" element={<Bookmarks/>}/>
                            <Route path="user" element={<UserAccountPage />} />
                            <Route path="billing" element={<BillingPage/>}/>

                            <Route path="*" element={<ErrorPage authenticatedRoutes />}/>
                        </Route>
                        :
                        <Route>
                            <Route index element={<Login/>}/>
                            <Route path="/" element={<Login/>}/>
                            <Route path="/login" element={<Login/>}/>
                            <Route path="/register" element={<Register/>}/>
                            <Route path="/forgot-password" element={<ForgotPassword/>}/>
                            <Route path="/reset-password" element={<ResetPassword/>}/>

                            <Route path="*" element={<ErrorPage/>}/>
                        </Route>
                }
            </Routes>
        </HashRouter>
    </div>;
}

export default App;

import React, {useEffect, useState} from 'react';
import './App.css';
import './assets/bootstrap.css';
import {HashRouter, Route, Routes} from "react-router-dom";
import AppContainer from "./pages/AppContainer";
import ErrorPage from "./pages/ErrorPage";
import UploadsPage from "./pages/Uploads";
import BucketDetail from "./pages/BucketDetail";
import Register from './pages/Register';
import Login from "./pages/Login";
import UserService from "./services/user-service";
import Buckets from "./pages/Buckets";
import Accounts from "./pages/Accounts";

function App() {
    
    const [authenticated, setAuthenticated] = useState(UserService.isLoggedIn());

    useEffect(() => {
        const see = UserService.sessionExpiredEvent.subscribe(() => {
            setAuthenticated(false);
            window.location.reload();
        });
        const sue = UserService.sessionUpdatedEvent.subscribe((session) => {
            setAuthenticated(session != null);
        });

        return () => {
            UserService.sessionExpiredEvent.unsubscribe(see);
            UserService.sessionUpdatedEvent.unsubscribe(sue);
        }
    }, [])
    
    return <div className="w-100 text-white">
        <HashRouter>
            <Routes>
                {
                    authenticated ? 
                        <Route element={<AppContainer />}>
                            <Route index element={<Accounts />}></Route>
                            <Route path="/" element={<Accounts />} />
                            <Route path="accounts" element={<Accounts />} />
                            <Route path="buckets" element={<Buckets />} />
                            <Route path="buckets/:bucketId" element={<BucketDetail />} />
                            <Route path="uploads" element={<UploadsPage />} />
                            <Route path="settings" element={<ErrorPage />} />
        
        
                            <Route path="*" element={<ErrorPage />} />
                        </Route>
                    :
                        <Route>
                            <Route index element={<Login />} />
                            <Route path="/" element={<Login />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            
                            <Route path="*" element={<ErrorPage />} />
                        </Route>
                }
            </Routes>
        </HashRouter>
    </div>;
}
export default App;

import React from 'react';
import './App.css';
import './assets/bootstrap.css';
import {HashRouter, Route, Routes} from "react-router-dom";
import Home from "./pages/Home";
import AppContainer from "./pages/AppContainer";
import ErrorPage from "./pages/ErrorPage";
import UploadsPage from "./pages/Uploads";
import BucketDetail from "./pages/BucketDetail";

function App() {
    return <div className="w-100 text-white">
        <HashRouter>
            <Routes>
                <Route element={<AppContainer />}>
                    <Route index element={<Home />}></Route>
                    <Route path="/" element={<Home />} />
                    <Route path="buckets" element={<Home />} />
                    <Route path="buckets/:bucketId" element={<BucketDetail />} />
                    <Route path="uploads" element={<UploadsPage />} />
                    <Route path="settings" element={<ErrorPage />} />


                    <Route path="*" element={<ErrorPage />} />
                </Route>
            </Routes>
        </HashRouter>
    </div>;
}
export default App;

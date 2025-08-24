import React from 'react';
import './App.css';
import './assets/bootstrap.css';
import {HashRouter, Route, Routes} from "react-router-dom";
import Home from "./pages/Home";
import AppContainer from "./pages/AppContainer";

function App() {
    return <div className="w-100">
        <HashRouter>
            <Routes>
                <Route element={<AppContainer />}>
                    <Route index element={<Home />}></Route>
                    <Route path="/" element={<Home />} />
                </Route>
            </Routes>
        </HashRouter>
    </div>;
}
export default App;

import React from 'react';
import './App.css';
import {HashRouter, Route, Routes} from "react-router-dom";
import Home from "./pages/Home";
import AppContainer from "./components/AppContainer";

function App() {
    return <HashRouter>
        <Routes>
            <Route element={<AppContainer />}>
                <Route index element={<Home />}></Route>
                <Route path="/" element={<Home />} />
            </Route>
        </Routes>
    </HashRouter>;
}
export default App;

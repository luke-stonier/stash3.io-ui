import React from 'react';
import logo from './assets/images/stash3_logo.png';
import './App.css';

function App() {
    return <div className="flex-fill bg-dark w-100 h-100">
        <div className="container-fluid mt-2">
            <div className="row">
                <div className="col-1">
                    <div className="d-flex align-items-center justify-content-center">
                        <img src={logo} className="w-100 d-block" alt="logo"/>
                    </div>
                </div>
                <div className="col-9">
                    <div className="d-flex align-items-center justify-content-start h-100 rounded">
                        <h1 className="display-6 my-0 fw-bold">Stash3.io</h1>
                    </div>
                </div>
                <div className="col-2">
                    <div className="d-flex align-items-center justify-content-end">
                        <button className="btn btn-outline-light">Login</button>
                    </div>
                </div>
            </div>
        </div>
    </div>;
}
export default App;

import logo from "../assets/images/stash3_logo.png";
import React from "react";
import { Outlet } from "react-router-dom";
import Icon from "../components/Icon";
import {IconButton} from "../components/Button";

class NavigationOption {
    id: string;
    name: string;
    icon: string;
}

export default function AppContainer() {
    
    const navigationOptions = [
        { id: 'buckets', name: 'Buckets', icon: 'inventory_2' },
        { id: 'uploads', name: 'Uploads', icon: 'upload' },
        { id: 'settings', name: 'Settings', icon: 'settings' },
    ];
    const [navigation, setNavigation] = React.useState<string>('buckets');
    
    return (
        <div className="min-vh-100 d-flex flex-column bg-dark text-light">
            {/* Main */}
            <main className="container-fluid flex-grow-1 overflow-hidden d-flex flex-column">
                <div className="row flex-grow-1 h-100 overflow-hidden">
                    {/* Sidebar */}
                    <div className="col-12 col-md-3 col-lg-2 border-end border-black overflow-auto min-h-0 py-3">
                        <div className="d-flex justify-content-center align-items-center gap-2">
                            <img
                                src={logo}
                                alt="logo"
                                className="img-fluid d-block"
                                style={{height: "2.25rem"}} /* ~36px @16px root, not fixed px */
                            />
                            <h1 className="h3 mb-0 fw-bold">Stash3.io</h1>
                        </div>

                        <div className="py-2"></div>
                        {/* nav / buckets */}

                        {
                            navigationOptions.map((option) => (
                                <IconButton key={option.name} icon={option.icon} filled={true} isButton={option.id !== navigation}
                                            staticClasses={'mb-2 w-100 text-start justify-content-start gap-2'}
                                            activeClasses={'btn btn-outline-warning'}
                                            disabledClasses={'bg-trans-warning text-white'}
                                            icon_inactiveColor={'text-warning'}>
                                    <span className="text-white">{option.name}</span>
                                </IconButton>
                            ))
                        }
                    </div>

                    {/* Content */}
                    <div className="col-12 col-md-9 col-lg-10 overflow-auto min-h-0 py-3">
                        <Outlet/>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="container-fluid border-top border-black py-1">
                <div className="d-flex align-items-center gap-2">
          <span className="badge bg-success p-2 rounded-circle">
            <span className="material-symbols">cloud</span>
          </span>
                    <small className="text-secondary">Ready</small>
                </div>
            </footer>
        </div>
    );
}

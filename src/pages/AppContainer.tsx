import logo from "../assets/images/stash3_logo.png";
import React, {useEffect} from "react";
import {Outlet, useNavigate} from "react-router-dom";
import {IconButton} from "../components/Button";
import {Avatar} from "../components/Avatar";
import AccountPicker from "../components/AccountPicker";


class NavigationOption {
    id: string;
    name: string;
    icon: string;
}

export default function AppContainer() {

    const navigation = useNavigate();
    const navigationOptions: NavigationOption[] = [
        {id: 'accounts', name: 'Accounts', icon: 'account_circle'},
        {id: 'buckets', name: 'Buckets', icon: 'inventory_2'},
        {id: 'billing', name: 'Billing', icon: 'credit_card'},
        {id: 'account', name: 'Account', icon: 'account_circle'},
        
        // {id: 'uploads', name: 'Uploads', icon: 'upload'},
        // {id: 'settings', name: 'Settings', icon: 'settings'},
    ];
    const [nav, setNav] = React.useState<string>('buckets');
    
    useEffect(() => {
        console.log("Navigation options", navigationOptions, nav);
    }, [nav])

    return (
        <div className="min-vh-100 d-flex flex-column bg-dark text-light">

            {/* Main */}
            <main className="container-fluid flex-grow-1 overflow-hidden d-flex flex-column min-h-0">
                <div className="row flex-grow-1 h-100 overflow-hidden">
                    {/* Sidebar */}
                    <div className="col-12 col-md-3 col-lg-2 border-end border-black overflow-auto min-h-0 py-3">
                        <div>
                            <div className="d-flex justify-content-center align-items-center gap-2">
                                <img
                                    src={logo}
                                    alt="logo"
                                    className="img-fluid d-block"
                                    style={{height: "2.25rem"}}
                                />
                                <h1 className="h3 mb-0 fw-bold">Stash3.io</h1>
                            </div>
                            <p className="d-block text-center mx-auto small">v0.0.1 (BETA)</p>
                        </div>

                        <div className="py-2"></div>
                        {/* nav / buckets */}

                        {
                            navigationOptions.map((option) => (
                                <IconButton key={option.name} icon={option.icon} filled={true}
                                            onClick={() => {
                                                setNav(option.id)
                                                navigation(option.id)
                                            }}
                                            isButton={option.id !== nav}
                                            staticClasses={'mb-2 w-100 text-start justify-content-start gap-2'}
                                            activeClasses={'btn-ghost btn-ghost-warning fw-normal'}
                                            disabledClasses={'bg-trans-warning text-white fw-bold'}
                                            icon_inactiveColor={'text-warning'}>
                                    <span className="text-white">{option.name}</span>
                                </IconButton>
                            ))
                        }
                    </div>

                    {/* Content */}
                    <div className="col-12 col-md-9 col-lg-10 min-h-0">
                        <div className="d-flex flex-column h-100 justify-content-between align-items-stretch w-100 gap-2 pt-3" style={{ maxHeight: '100vh' }}>
                            <div className="d-flex justify-content-end align-items-center gap-4">
                                <AccountPicker />
                                {/*<div className="bg-lighter border-0 rounded-pill w-100 d-flex align-items-center justify-content-start gap-2 px-3 py-2">*/}
                                {/*    <Icon name="search" />*/}
                                {/*    <input className="bg-transparent text-white border-0 flex-fill" placeholder='Search buckets or files...' />*/}
                                {/*</div>*/}
                                <Avatar name={'Luke Stonier'}/>
                            </div>
                            
                            <div className="mt-3 flex-column d-flex align-items-stretch justify-content-start w-100 h-100 min-h-0 px-1 mb-2" style={{overflowX: 'hidden', overflowY: 'auto'}}>
                                {/*<p className="d-block">{window.location.href}</p>*/}
                                <Outlet/>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

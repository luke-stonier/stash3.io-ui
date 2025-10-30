import logo from "../assets/images/stash3_logo.png";
import React, {useEffect} from "react";
import {Outlet, useLocation, useNavigate} from "react-router-dom";
import {IconButton} from "../components/Button";
import {Avatar} from "../components/Avatar";
import AccountPicker from "../components/AccountPicker";
import UserService from "../services/user-service";
import useGlobalShortcut from "../hooks/useGlobalShortcut";
import {SearchWidgetModal} from "../components/SearchWidget";
import {STASH_VERSION} from "../App";


class BaseNavOption {
    isSpace?: boolean = false;
}

class NavigationOption extends BaseNavOption {
    id: string;
    name: string;
    icon: string;
}

type NavOption = NavigationOption | BaseNavOption;

export default function AppContainer() {

    const location = useLocation();
    const navigation = useNavigate();
    const navigationOptions: NavOption[] = [
        {id: 'accounts', name: 'Credentials', icon: 'passkey'},
        {id: 'buckets', name: 'Buckets', icon: 'cloud'},
        {id: 'bookmarks', name: 'Bookmarks', icon: 'bookmark'},

        {isSpace: true},

        {id: 'billing', name: 'Billing', icon: 'sell'},
        {id: 'user', name: 'User', icon: 'account_circle'},

        // {id: 'uploads', name: 'Uploads', icon: 'upload'},
        // {id: 'settings', name: 'Settings', icon: 'settings'},
    ];
    const [nav, setNav] = React.useState<string>('buckets');

    useEffect(() => {
        const nav = location.pathname.split('/')[1];
        if (nav) setNav(nav);
    }, [location]);
    
    useGlobalShortcut([
        { key: 'b', ctrl: true },
        { key: 'b', meta: true },
    ], () => {
        navigation('/bookmarks')
    });

    useEffect(() => {
        console.log('container render')
    }, []);
    
    const NavRow = (baseOption: NavOption) => {
        const option = baseOption as NavigationOption;
        return <IconButton key={option.name} icon={option.icon} filled={true}
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
    }
    
    return (
        <div className="min-vh-100 d-flex flex-column bg-dark text-light">
            
            <SearchWidgetModal />
            
            {/* Main */}
            <main className="container-fluid flex-grow-1 overflow-hidden d-flex flex-column min-h-0" style={{ height: '100vh' }}>
                <div className="row flex-grow-0 flex-grow-lg-1 h-100 overflow-hidden">
                    {/* Sidebar */}
                    <div className="col-12 col-md-3 col-lg-2 border-end border-black overflow-auto min-h-0 py-3 d-flex flex-column">
                        <div className="d-flex d-md-block justify-content-between align-items-center">
                            <div className="d-flex justify-content-center align-items-center gap-2">
                                <img
                                    src={logo}
                                    alt="logo"
                                    className="img-fluid d-block"
                                    style={{height: "2.25rem"}}
                                />
                                <div>
                                    <h1 className="h3 mb-0 fw-bold">Stash3.io</h1>
                                    {/*<p className="d-block text-center mx-auto small">v0.0.1 (BETA)</p>*/}
                                </div>
                            </div>

                            <div className="d-flex d-md-none justify-content-end align-items-center gap-2 flex-grow">
                                <AccountPicker/>
                                <Avatar name={UserService.GetCurrentUserSession()?.user.email || ''}/>
                            </div>
                        </div>

                        <div className="d-none d-md-block py-2"></div>
                        {/* nav / buckets */}

                        <div className="d-none d-md-block">
                            {
                                navigationOptions.map((option) => (
                                    option.isSpace ?
                                        <hr key={Math.random().toString(36).substring(2, 15)}
                                            className="my-2 my-md-2 border-0 border-top border-white"/> :
                                        NavRow(option)
                                ))
                            }
                        </div>

                        <div className="flex-grow-1 align-self-stretch w-100"></div>
                        <div className="flex-shrink-0 w-100">
                            <p className="my-0 text-center">Version {STASH_VERSION}</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="col-12 col-md-9 col-lg-10 min-h-0">
                        <div
                            className="d-flex flex-column h-100 justify-content-between align-items-stretch w-100 gap-2 pt-3"
                            style={{maxHeight: '100vh'}}>
                            <div className="d-none d-md-flex justify-content-end align-items-center gap-4">
                                {/*<SearchWidget/>*/}
                                <AccountPicker/>
                                <Avatar name={UserService.GetCurrentUserSession()?.user.email || ''}/>
                            </div>

                            <div
                                className="mt-3 flex-column d-flex align-items-stretch justify-content-start w-100 h-100 min-h-0 px-1 mb-2"
                                style={{overflowX: 'hidden', overflowY: 'auto'}}>
                                {/*<span className="d-block">{window.location.href} -- {location.pathname}{location.search}</span>*/}
                                <Outlet/>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

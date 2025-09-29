import EventEmitter from "./event-emitter";
import UserSession from "../Models/UserSession";
import AwsAccount from "../Models/AwsAccount";
import {jwtDecode} from "jwt-decode";

export default class UserService {
    static currentSession: UserSession | null;
    static currentAWSAccount: AwsAccount | null = null;
    
    static sessionUpdatedEvent = new EventEmitter<UserSession>();
    static sessionExpiredEvent = new EventEmitter<void>();
    static accountsUpdatedEvent = new EventEmitter<AwsAccount[]>();
    static changeAWSAccountEvent = new EventEmitter<AwsAccount | null>();

    static GetAWSAccount = () => {
        //if (UserService.currentAWSAccount === null) console.error("No AWS account selected.");
        return UserService.currentAWSAccount;
    }
    
    static UpdateAWSAccount = (account: AwsAccount | null) => {
        UserService.currentAWSAccount = account;
        UserService.changeAWSAccountEvent.emit(account);
    };
    
    static UpdateSession = (session: UserSession | null) => {
        try {
            UserService.currentSession = session;
            if (session !== null) {
                localStorage.setItem('session', JSON.stringify(session));
                localStorage.setItem('token', session.token);
                UserService.sessionUpdatedEvent.emit(session);
            } else UserService.sessionExpiredEvent.emit();
        } catch (er) {
            console.error('Failed to update session', er);
        }
    };
    
    static GetCurrentUserSession = () => {
        if (UserService.currentSession === undefined) {
            const localSession = localStorage.getItem('session');
            if (localSession !== null) {
                try {
                    UserService.currentSession = JSON.parse(localSession) as UserSession;
                } catch (er) {
                    console.error('Failed to parse local session', er);
                    UserService.currentSession = null;
                }
            } else UserService.currentSession = null;
        }
        return UserService.currentSession;
    }
    
    static isLoggedIn = () => {
        const localSession = localStorage.getItem('session');
        const localToken = localStorage.getItem('token');
        if (localSession === null || localToken === null) return false; // not logged in
        const decodedToken = jwtDecode(localToken);
        const exp = (decodedToken as any).exp;
        if (Date.now() >= exp * 1000) {
            UserService.SignOut();
            return false;
        }
        return true;
    };

    static GetToken = () => {
        return localStorage.getItem('token');
    };
    
    static SignOut = () => {
        UserService.UpdateSession(null);
        localStorage.removeItem('token');
        localStorage.removeItem('session');
    };
}
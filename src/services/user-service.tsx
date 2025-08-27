import EventEmitter from "./event-emitter";
import UserSession from "../Models/UserSession";

export default class UserService {
    static currentSession: UserSession | null;

    static sessionUpdatedEvent = new EventEmitter<UserSession>();
    static sessionExpiredEvent = new EventEmitter<void>();
    static invalidPermissionsEvent = new EventEmitter<void>();

    static UpdateSession = (session: UserSession | null) => {
        try {
            console.log('update session', session);
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
    
    static isLoggedIn = () => {
        return UserService.currentSession !== null && UserService.currentSession !== undefined;
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
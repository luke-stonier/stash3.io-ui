import EventEmitter from "./event-emitter";
import UserSession from "../Models/UserSession";

export default class UserService {
    static currentSession: UserSession | null;

    static sessionUpdatedEvent = new EventEmitter<UserSession>();
    static sessionExpiredEvent = new EventEmitter<void>();
    static invalidPermissionsEvent = new EventEmitter<void>();

    static UpdateSession = (session: UserSession | null) => {
        UserService.currentSession = session;
        if (session !== null) UserService.sessionUpdatedEvent.emit(session);
        else UserService.sessionExpiredEvent.emit();
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
    };
}
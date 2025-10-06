import {Link, useLocation, useNavigate} from "react-router-dom";
import UserService from "../services/user-service";

export default function ErrorPage({authenticatedRoutes = false}: { authenticatedRoutes?: boolean }) {
    const location = useLocation();
    const navigate = useNavigate();

    if (authenticatedRoutes && !UserService.isLoggedIn()) {
        navigate('/login');
        return (
            <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
                <h1 className="display-1">403</h1>
                <p className="lead">Access Denied</p>
                <p className="text-muted mb-0">You must be logged in to access this page.</p>
                <small className="text-muted fst-italic my-4 text-center w-75">{location.pathname}{location.search}</small>
                <Link className="text-white" to="/">Back to Login</Link>
            </div>
        );
    }
    
    if (!authenticatedRoutes && !UserService.isLoggedIn()) {
        navigate('/login');
        return (
            <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
                <h1 className="display-1">404</h1>
                <p className="lead">Page Not Found</p>
                <p className="text-muted mb-0">The page you are looking for does not exist.</p>
                <small className="text-muted fst-italic my-4 text-center w-75">{location.pathname}{location.search}</small>
                <Link className="text-white" to="/">Back to Login</Link>
            </div>
        );
    }
    
    
    return (
        <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
            <h1 className="display-1">404</h1>
            <p className="lead">Page Not Found</p>
            <p className="text-muted mb-0">The page you are looking for does not exist.</p>
            <small className="text-muted fst-italic my-4 text-center w-75">{location.pathname}{location.search}</small>
            <Link className="text-white" to="/">Back Home</Link>
        </div>
    );
}
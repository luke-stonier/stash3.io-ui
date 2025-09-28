import {Link, useLocation} from "react-router-dom";

export default function ErrorPage() {
    const location = useLocation();
    
    return (
        <div className="d-flex flex-column align-items-center justify-content-center w-100">
            <h1 className="display-1">404</h1>
            <p className="lead">Page Not Found</p>
            <p className="text-muted mb-0">The page you are looking for does not exist.</p>
            <small className="text-muted fst-italic my-4">{location.pathname}{location.search}</small>
            <Link className="text-white" to="/">Back Home</Link>
        </div>
    );
}
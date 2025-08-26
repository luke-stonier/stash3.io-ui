import React from "react";
import UserService from "../services/user-service";

type AvatarProps = {
    src?: string;        // optional image URL
    name: string;        // fallback to initials
    size?: number;       // rem units, default 2.25
};

export function Avatar({src, name, size = 2.25}: AvatarProps) {
    // Compute initials from name
    const initials = name
        .split(" ")
        .map(part => part[0]?.toUpperCase())
        .join("")
        .slice(0, 2);

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className="rounded-circle d-block"
                style={{height: `${size}rem`, width: `${size}rem`, objectFit: "cover"}}
            />
        );
    }

    return (
        <div className="dropdown">
            <button
                type="button" data-bs-toggle="dropdown"
                className="dropdown-toggle no-caret border-0 rounded-circle d-flex align-items-center justify-content-center fw-bold"
                style={{
                    height: `${size}rem`,
                    width: `${size}rem`,
                    minHeight: `${size}rem`,
                    minWidth: `${size}rem`,
                    backgroundColor: "var(--bs-primary)",
                    color: "white",
                    fontSize: `${size * 0.4}rem`,
                }}
            >
                {initials}
            </button>
            <ul className="dropdown-menu dropdown-menu-dark">
                <li>
                    <button className="dropdown-item" type="button">Account</button>
                </li>
                <li>
                    <button className="dropdown-item" type="button" onClick={UserService.SignOut}>Sign Out</button>
                </li>
            </ul>
        </div>
    );
}

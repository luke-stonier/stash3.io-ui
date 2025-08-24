import React from "react";

type AvatarProps = {
    src?: string;        // optional image URL
    name: string;        // fallback to initials
    size?: number;       // rem units, default 2.25
};

export function Avatar({ src, name, size = 2.25 }: AvatarProps) {
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
                style={{ height: `${size}rem`, width: `${size}rem`, objectFit: "cover" }}
            />
        );
    }

    return (
        <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
            style={{
                height: `${size}rem`,
                width: `${size}rem`,
                backgroundColor: "var(--bs-primary)",
                color: "white",
                fontSize: `${size * 0.4}rem`,
            }}
        >
            {initials}
        </div>
    );
}

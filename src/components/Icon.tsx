import {CSSProperties} from "react";

export default function Icon({ className, style, name, filled = false }: { className?: string, style?: CSSProperties, name: string, filled?: boolean }) {
    return (
        <span className={`${className} material-symbols${filled ? ' filled' : ''}`} style={style}>
            {name}
        </span>
    );
}
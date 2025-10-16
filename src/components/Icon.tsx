import {CSSProperties} from "react";

export default function Icon({ className, style, name, onClick, filled = false }: { className?: string, style?: CSSProperties, name: string, onClick?: () => void, filled?: boolean }) {
    return (
        <span className={`${className} material-symbols${filled ? ' filled' : ''}`} style={style} onClick={() => {
            if (onClick === null || onClick === undefined) return;
            onClick()
        }}>
            {name}
        </span>
    );
}
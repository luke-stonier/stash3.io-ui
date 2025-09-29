import Icon from "./Icon";
import React from "react";

export type ButtonProps = {
    onClick?: () => void;
    disabled?: boolean;
    children?: React.ReactNode;
    staticClasses?: string;
    activeClasses?: string;
    disabledClasses?: string;
    isButton?: boolean;
};

export type IconButtonProps = ButtonProps & {
    icon: string;
    filled?: boolean;
    icon_activeColor?: string;
    icon_inactiveColor?: string;
    iconClasses?: string;
    iconFirst?: boolean;
}
export function Button({ isButton = true, staticClasses = 'btn-ghost btn-ghost-warning', ...props}: ButtonProps) {
    
    const btnRef = React.useRef<HTMLButtonElement>(null);
    
    if (isButton) {
        return <button
            ref={btnRef}
            onClick={(e) => {
                e.stopPropagation();
                btnRef.current?.blur();
                props && props.onClick  && props.onClick();
            }}
            disabled={props.disabled}
            className={`rounded-3 p-2 ${staticClasses} ${props.activeClasses ?? ''}`}>
            {props.children}
        </button>
    }
    
    return <div className={`rounded-3 p-2 ${staticClasses} ${props.disabledClasses ?? ''}`} style={{ cursor: 'default', userSelect: 'none' }}>
        {props.children}
    </div>
}

export function IconButton({iconFirst = true,  staticClasses = 'btn-ghost btn-ghost-warning', isButton = true, ...props}: IconButtonProps) {
    return <Button
        isButton={isButton}
        onClick={props.onClick}
        disabled={props.disabled}
        staticClasses={`d-flex align-items-center ${staticClasses}`}
        disabledClasses={props.disabledClasses}
        activeClasses={props.activeClasses}>
        { iconFirst && <Icon name={props.icon} filled={props.filled} className={`${props.iconClasses} ${isButton ? props.icon_activeColor : props.icon_inactiveColor}`} /> }
            {props.children}
        { !iconFirst && <Icon name={props.icon} filled={props.filled} className={`${props.iconClasses} ${isButton ? props.icon_activeColor : props.icon_inactiveColor}`} /> }
    </Button>
}
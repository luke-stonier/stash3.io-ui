import Icon from "./Icon";
import React from "react";

export type ButtonProps = {
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    staticClasses?: string;
    iconClasses?: string;
    activeClasses?: string;
    disabledClasses?: string;
    isButton?: boolean;
};

export type IconButtonProps = ButtonProps & {
    icon: string;
    filled?: boolean;
    icon_activeColor?: string;
    icon_inactiveColor?: string;
}
export function Button(props: ButtonProps) {
    if (props.isButton) {
        return <button
            onClick={props.onClick}
            disabled={props.disabled}
            className={`rounded-3 p-2 ${props.staticClasses} ${props.activeClasses ?? ''}`}>
            {props.children}
        </button>
    }
    
    return <div className={`rounded-3 p-2 ${props.staticClasses} ${props.disabledClasses ?? ''}`} style={{ cursor: 'default', userSelect: 'none' }}>
        {props.children}
    </div>
}

export function IconButton(props: IconButtonProps) {
    return <Button
        isButton={props.isButton}
        onClick={props.onClick}
        disabled={props.disabled}
        staticClasses={`d-flex align-items-center ${props.staticClasses}`}
        disabledClasses={props.disabledClasses}
        activeClasses={props.activeClasses}>
            <Icon name={props.icon} filled={props.filled} className={`${props.iconClasses} ${props.isButton ? props.icon_activeColor : props.icon_inactiveColor}`} />
            {props.children}
    </Button>
}
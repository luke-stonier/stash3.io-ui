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

    // ✅ minimal pass-throughs for keyboard/ARIA/list usage
    id?: string;
    role?: string;
    tabIndex?: number;
    className?: string;
    onMouseEnter?: React.MouseEventHandler<HTMLElement>;
    onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
    onFocus?: React.FocusEventHandler<HTMLElement>;
    onBlur?: React.FocusEventHandler<HTMLElement>;
    // common ARIA
    ['aria-selected']?: boolean;
    ['aria-controls']?: string;
    ['aria-expanded']?: boolean;
};


export type IconButtonProps = ButtonProps & {
    icon: string;
    filled?: boolean;
    icon_activeColor?: string;
    icon_inactiveColor?: string;
    iconClasses?: string;
    iconFirst?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement | HTMLDivElement, ButtonProps>(
    ({ isButton = true, staticClasses = 'btn-ghost btn-ghost-warning', ...props }, ref) => {

        if (isButton) {
            return (
                <button
                    ref={ref as React.Ref<HTMLButtonElement>}
                    onClick={(e) => {
                        e.stopPropagation();
                        (e.currentTarget as HTMLButtonElement).blur();
                        props.onClick?.();
                    }}
                    disabled={props.disabled}
                    className={`rounded-3 p-2 ${staticClasses} ${props.activeClasses ?? ''}`}
                >
                    {props.children}
                </button>
            );
        }

        return (
            <div
                ref={ref as React.Ref<HTMLDivElement>}
                className={`rounded-3 p-2 ${staticClasses} ${props.disabledClasses ?? ''}`}
                style={{ cursor: 'default', userSelect: 'none' }}
            >
                {props.children}
            </div>
        );
    }
);

Button.displayName = "Button";

export const IconButton = React.forwardRef<HTMLButtonElement | HTMLDivElement, IconButtonProps>(
    ({ iconFirst = true, staticClasses = 'btn-ghost btn-ghost-warning', isButton = true, ...props }, ref) => {
        return (
            <Button
                ref={ref}
                isButton={isButton}
                onClick={props.onClick}
                disabled={props.disabled}
                staticClasses={`d-flex align-items-center ${staticClasses}`}
                disabledClasses={props.disabledClasses}
                activeClasses={props.activeClasses}
                {...props}
            >
                {iconFirst && (
                    <Icon
                        name={props.icon}
                        filled={props.filled}
                        className={`${props.iconClasses} ${isButton ? props.icon_activeColor : props.icon_inactiveColor}`}
                    />
                )}
                {props.children}
                {!iconFirst && (
                    <Icon
                        name={props.icon}
                        filled={props.filled}
                        className={`${props.iconClasses} ${isButton ? props.icon_activeColor : props.icon_inactiveColor}`}
                    />
                )}
            </Button>
        );
    }
);

IconButton.displayName = "IconButton";
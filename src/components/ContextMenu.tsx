import React, { useEffect, useLayoutEffect, useRef } from "react";

type MenuSeparator = { type: "title" | "separator", data?: string };

type MenuAction = {
    id: string;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
};

export type MenuItem = MenuAction | MenuSeparator;

export type ContextMenuProps = {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
};

function isAction(item: MenuItem): item is MenuAction {
    // if it has no "type" or type !== "separator", treat as action
    return !("type" in item);
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    // ESC / outside click to close
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        window.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onDown);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onDown);
        };
    }, [onClose]);

    // keep in viewport
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        // set initial position
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        // measure and nudge
        const rect = el.getBoundingClientRect();
        const nx = Math.min(x, window.innerWidth - rect.width - 8);
        const ny = Math.min(y, window.innerHeight - rect.height - 8);
        el.style.left = `${Math.max(8, nx)}px`;
        el.style.top = `${Math.max(8, ny)}px`;
    }, [x, y]);

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1080, pointerEvents: "all", backgroundColor: "rgba(0,0,0,0.3)" }}>
            <div
                ref={ref}
                role="menu"
                className="dropdown-menu show bg-lighter text-light shadow border-0"
                style={{
                    position: "fixed",
                    minWidth: 220,
                    padding: 6,
                    borderRadius: 12,
                    pointerEvents: "auto",
                    "--bs-dropdown-link-hover-bg": "rgba(255, 90, 0, .18)",
                } as React.CSSProperties}
            >
                {items.map((item, idx) => {
                    if (!isAction(item)) {
                        if (item.type === "title") {
                            return (
                                <p
                                    key={`title-${idx}`}
                                    className="dropdown-header text-muted"
                                    style={{ textTransform: "uppercase" }}
                                >
                                    {item.data}
                                </p>
                            );
                        }
                        
                        return (
                            <div
                                key={`sep-${idx}`}
                                className="border-bottom border-light"
                                role="separator"
                                style={{ margin: "6px 4px", opacity: 0.2 }}
                            />
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            role="menuitem"
                            type="button"
                            className="dropdown-item d-flex align-items-center gap-2 text-white my-2 rounded-3"
                            onClick={() => { item.onClick?.(); onClose(); }}
                            disabled={!!item.disabled}
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            {item.icon ? (
                                <span className="d-inline-flex" style={{ width: 20, justifyContent: "center" }}>
                  {item.icon}
                </span>
                            ) : null}
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

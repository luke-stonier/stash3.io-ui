import React, {useState} from "react";
import ContextMenu, {ContextMenuProps} from "../components/ContextMenu";

export function useContextMenu() {
    const [menu, setMenu] = useState<null | Omit<ContextMenuProps, "onClose">>(null);

    const open = React.useCallback(
        (e: React.MouseEvent, items: ContextMenuProps["items"]) => {
            e.preventDefault();
            setMenu({x: e.clientX, y: e.clientY, items});
        },
        []
    );

    const contextElement = menu ? (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)}/>
    ) : null;

    return {open, contextElement, close: () => setMenu(null)};
}

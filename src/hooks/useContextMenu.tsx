import React, {useState} from "react";
import { createPortal } from "react-dom";
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

    const contextElement = menu ? createPortal(
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)}/>,
        document.body
    ) : null;

    return {open, contextElement, close: () => setMenu(null)};
}

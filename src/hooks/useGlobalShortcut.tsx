import { useEffect } from "react";

type KeyCombo = {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean; // Command on Mac, Windows key on Windows
};

export default function useGlobalShortcut(
    combos: KeyCombo[],
    callback: () => void
) {
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {            
            for (const combo of combos) {
                const matches =
                    event.key.toLowerCase() === combo.key.toLowerCase() &&
                    (!!combo.ctrl === event.ctrlKey) &&
                    (!!combo.alt === event.altKey) &&
                    (!!combo.shift === event.shiftKey) &&
                    (!!combo.meta === event.metaKey);

                if (matches) {
                    event.preventDefault();
                    callback();
                    break;
                }
            }
        };

        window.addEventListener("keydown", handler);
        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, [combos, callback]);
}

import React, {useEffect, useMemo, useRef, useState} from "react";

export type JsonEditorProps = {
    /** Any JSON-serializable value */
    value: unknown;
    /** Number of spaces to use for pretty-printing the prop value */
    indent?: number;
    /** Disable editing */
    readOnly?: boolean;
    /** Called whenever the text content changes (raw text only; no parsing) */
    onTextChange?: (text: string) => void;
    /** Optional aria-label for the textarea */
    ariaLabel?: string;
    /** Optional className for custom styling */
    className?: string;
};

const stringifySafe = (v: unknown, indent: number) => {
    try {
        return JSON.stringify(v, null, indent);
    } catch {
        return String(v);
    }
};

export default function JsonEditor({
                                       value,
                                       indent = 2,
                                       readOnly,
                                       onTextChange,
                                       ariaLabel = "JSON editor",
                                       className,
                                   }: JsonEditorProps) {
    const pretty = useMemo(() => stringifySafe(value, indent), [value, indent]);
    const [text, setText] = useState(pretty);
    const isFocusedRef = useRef(false);

    useEffect(() => {
        if (!isFocusedRef.current) {
            setText(pretty);
        }
    }, [pretty]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value;
        setText(next);
        onTextChange?.(next);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const el = e.currentTarget;
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? 0;
            const tab = " ".repeat(indent);
            const before = text.slice(0, start);
            const after = text.slice(end);
            const next = before + tab + after;
            setText(next);
            requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = start + tab.length;
            });
        }
    };

    return (
        <div className={`mb-3 ${className ?? ""}`}>

            {/* is valid json? green border, else red border */}
            <textarea
                aria-label={ariaLabel}
                value={text}
                readOnly={readOnly}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => (isFocusedRef.current = true)}
                onBlur={() => (isFocusedRef.current = false)}
                className={`light-scroll form-control font-monospace`}
                style={{
                    minHeight: "320px",
                    whiteSpace: "pre",
                    overflowWrap: "normal",
                    overflowX: "auto",
                    resize: 'vertical',
                }}
                spellCheck={false}
                wrap="off"
            />
        </div>
    );
}
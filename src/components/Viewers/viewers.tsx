import React, { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { marked } from "marked";

// viewers/ImageViewer.tsx
export const ImageViewer = ({ url, alt }: { url: string; alt?: string }) => (
    <div className="d-flex justify-content-center align-items-center w-100 h-100">
        <img src={url} alt={alt} className="d-block w-auto h-100" style={{ objectFit: "contain" }} />
    </div>
);

// viewers/VideoViewer.tsx
export const VideoViewer = ({ url }: { url: string }) => (
    <div className="d-flex justify-content-center align-items-center w-100 h-100">
        <video controls src={url} className="d-block w-auto h-100" style={{ objectFit: "contain" }} />
    </div>
);

// viewers/AudioViewer.tsx
export const AudioViewer = ({ url }: { url: string }) => (
    <audio controls src={url} className="w-100" />
);

// viewers/PdfViewer.tsx
export const PdfViewer = ({ url }: { url: string }) => (
    <iframe src={url} title="PDF" className="w-100" style={{ height: "80vh" }} />
);

// viewers/TextViewer.tsx
export const TextViewer = ({ url }: { url: string }) => {
    const [text, setText] = useState<string>("Loading...");
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const ac = new AbortController();
        let mounted = true;
        let cancelled = false;
        
        (async () => {
            try {
                const res = await fetch(url, {
                    headers: {Range: "bytes=0-2097151"},
                    credentials: "omit",
                    signal: ac.signal,
                });

                // If CORS or network failure, fetch throws; if HTTP error, res.ok is false
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} ${res.statusText}`);
                }

                if (cancelled) return;

                const buf = await res.arrayBuffer();
                const sample = new TextDecoder("utf-8", {fatal: false}).decode(buf);
                if (mounted) setText(sample);
            } catch (err) {
                if (cancelled) return;
                setError(String(err));
                setText("");
                console.debug("Text preview fetch failed:", err);
            }
        })();

        return () => {
            cancelled = true;
            ac.abort();
        };
    }, [url]);

    if (text === "") {
        return <div className="text-muted flex-column d-flex align-items-center justify-content-center w-100 h-100">
            <p className="text-center d-block">No data to display.</p>
            {error && <>
                <p className="text-center d-block my-0">{error}</p>
                <p className="text-center d-block my-0">This can be caused by CORS not being configured for the
                    bucket.</p>
            </>}
        </div>;
    }
    
    return <pre className="text-white small">{text}</pre>;
};

// viewers/MarkdownViewer.tsx
export const MarkdownViewer = ({ url }: { url: string }) => {
    const [html, setHtml] = useState<string>("Loading...");
    useEffect(() => {
        let mounted = true;
        (async () => {
            const res = await fetch(url, { headers: { Range: "bytes=0-1048575" } });
            const md = await res.text();
            const rendered = marked.parse(md);
            if (mounted) setHtml(String(rendered));
        })();
        return () => { mounted = false; };
    }, [url]);
    return <div className="p-3" dangerouslySetInnerHTML={{ __html: html }} />;
};

// viewers/CodeViewer.tsx
export const CodeViewer = ({ url, filename }: { url: string; filename: string }) => {
    const [code, setCode] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    
    const language = useMemo(() => {
        const ext = (filename.split(".").pop() || "").toLowerCase();
        const map: Record<string, string> = {
            ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
            css: "css", json: "json", html: "html", md: "markdown",
            yml: "yaml", yaml: "yaml", py: "python", go: "go", rs: "rust",
            java: "java", c: "c", cpp: "cpp", cs: "csharp", php: "php",
            rb: "ruby", kt: "kotlin", sh: "shell", sql: "sql"
        };
        return map[ext] ?? "plaintext";
    }, [filename]);
    
    useEffect(() => {
        const ac = new AbortController();
        let mounted = true;
        let cancelled = false;
        
        (async () => {
            try {
                const res = await fetch(url, {
                    headers: {Range: "bytes=0-2097151"},
                    credentials: "omit",
                    signal: ac.signal,
                });

                // If CORS or network failure, fetch throws; if HTTP error, res.ok is false
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} ${res.statusText}`);
                }

                if (cancelled) return;

                const text = await res.text();
                if (mounted) setCode(text);
            } catch (err) {
                if (cancelled) return;
                setError(String(err));
                setCode("");
                console.debug("Code preview fetch failed:", err);
            }
        })();
        
        return () => {
            cancelled = true;
            ac.abort();
        };
    }, [url]);

    if (code === "") {
        return <div className="text-muted flex-column d-flex align-items-center justify-content-center w-100 h-100">
            <p className="text-center d-block">No data to display.</p>
            {error && <>
                <p className="text-center d-block my-0">{error}</p>
                <p className="text-center d-block my-0">This can be caused by CORS not being configured for the
                    bucket.</p>
            </>}
        </div>;
    }
    
    return (
        <Editor
            height="80vh"
            defaultLanguage={language}
            value={code}
            options={{ readOnly: true, minimap: { enabled: false } }}
        />
    );
};

// viewers/CsvViewer.tsx
export const CsvViewer = ({ url }: { url: string }) => {
    const [rows, setRows] = useState<string[][]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const ac = new AbortController();
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(url, {
                    headers: { Range: "bytes=0-2097151" },
                    credentials: "omit",
                    signal: ac.signal,
                });

                // If CORS or network failure, fetch throws; if HTTP error, res.ok is false
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} ${res.statusText}`);
                }

                const text = await res.text();
                if (cancelled) return;

                const lines = text.split(/\r?\n/).filter(Boolean);
                const parsed = lines.map(l => l.split(","));
                setRows(parsed);
            } catch (err) {
                if (cancelled) return;
                setError(String(err));
                console.debug("CSV preview fetch failed:", err);
                setRows([]);
            }
        })();

        return () => {
            cancelled = true;
            ac.abort();
        };
    }, [url]);

    if (rows.length === 0) {
        return <div className="text-muted flex-column d-flex align-items-center justify-content-center w-100 h-100">
            <p className="text-center d-block">No data to display.</p>
            {error && <>
                <p className="text-center d-block my-0">{error}</p>
                <p className="text-center d-block my-0">This can be caused by CORS not being configured for the bucket.</p>
            </>}
        </div>;
    }
    
    return (
        <div className="table-responsive" style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <table className="table table-sm table-bordered">
                <tbody>
                {rows.map((r, i) => (
                    <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

// viewers/JsonViewer.tsx
export const JsonViewer = ({ url }: { url: string }) => {
    const [text, setText] = useState<string>("Loading…");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const ac = new AbortController();
        let mounted = true;
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(url, {
                    headers: { Range: "bytes=0-2097151" },
                    credentials: "omit",
                    signal: ac.signal,
                });

                // If CORS or network failure, fetch throws; if HTTP error, res.ok is false
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} ${res.statusText}`);
                }
                
                if (cancelled) return;

                const t = await res.text();
                const pretty = JSON.stringify(JSON.parse(t), null, 2);
                if (mounted) setText(pretty);
            } catch (err) {
                if (cancelled) return;
                setError(String(err));
                setText("");
                console.debug("CSV preview fetch failed:", err);
            }
        })();

        return () => {
            cancelled = true;
            ac.abort();
        };
    }, [url]);
    
    if (text === "") {
        return <div className="text-muted flex-column d-flex align-items-center justify-content-center w-100 h-100">
            <p className="text-center d-block">No data to display.</p>
            {error && <>
                <p className="text-center d-block my-0">{error}</p>
                <p className="text-center d-block my-0">This can be caused by CORS not being configured for the
                    bucket.</p>
            </>}
        </div>;
    }
    
    return <pre className="text-white small">{text}</pre>;
};

// viewers/HtmlViewer.tsx
export const HtmlViewer = ({ url, sandbox = true }: { url: string; sandbox?: boolean }) => (
    <iframe
        src={url}
        className="w-100 bg-white"
        style={{ height: "80vh" }}
        sandbox={sandbox ? "allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts" : undefined}
    />
);

// viewers/BinaryFallback.tsx
export const BinaryFallback = ({
                                   filename, contentType, contentLength, url, reason,
                               }: {
    filename: string; contentType?: string; contentLength?: number; url: string; reason?: string;
}) => (
    <div className="p-3 border rounded bg-light">
        <div className="fw-bold mb-1">{filename}</div>
        <div className="text-muted small mb-2">
            {reason ? reason + " " : ""}Can’t preview this item.
        </div>
        <div className="text-secondary small mb-2">
            {contentType && <>MIME: {contentType} · </>}
            {typeof contentLength === "number" && <>Size: {Intl.NumberFormat().format(contentLength)} bytes</>}
        </div>
        <div>
            <a className="btn btn-dark btn-sm" href={url} download>Download</a>
        </div>
    </div>
);

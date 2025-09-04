import React, {useEffect} from 'react';
import Icon from "./Icon";
import {BinaryFallback, AudioViewer, CodeViewer, CsvViewer, HtmlViewer, ImageViewer, JsonViewer, MarkdownViewer, PdfViewer, TextViewer, VideoViewer} from "./Viewers/viewers";
import APIWrapperService from "../services/APIWrapperService";

export type ViewerKind =
    | "image"
    | "video"
    | "audio"
    | "pdf"
    | "markdown"
    | "text"
    | "code"
    | "csv"
    | "json"
    | "html"
    | "binary"; // unknown/unpreviewable

// map MIME → kind (few rules go a long way)
const mimeToKindRules: Array<[RegExp, ViewerKind]> = [
    [/^image\//, "image"],
    [/^video\//, "video"],
    [/^audio\//, "audio"],
    [/^application\/pdf$/, "pdf"],
    [/^text\/markdown$/, "markdown"],
    [/^text\/(plain|x-log)$/,"text"],
    [/^application\/json$/, "json"],
    [/^text\/csv$/, "csv"],
    [/^text\/html$/, "html"],
];

// extension fallbacks (lowercased, no leading dot)
const extToKind: Record<string, ViewerKind> = {
    // images
    png: "image", jpg: "image", jpeg: "image", webp: "image", gif: "image", svg: "image", avif: "image", heic: "image",
    // video
    mp4: "video", webm: "video", mkv: "video", mov: "video", m4v: "video",
    // audio
    mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio", flac: "audio",
    // docs
    pdf: "pdf", md: "markdown", markdown: "markdown",
    // text/code
    txt: "text", log: "text", json: "json", csv: "csv", html: "html",
    js: "code", ts: "code", tsx: "code", jsx: "code", css: "code",
    py: "code", go: "code", rs: "code", java: "code", c: "code", cpp: "code", cs: "code", php: "code", rb: "code", kt: "code",
    yml: "code", yaml: "code", toml: "code", ini: "code", sql: "code", sh: "code", bash: "code", zsh: "code",
};

export function kindFromMime(mime?: string): ViewerKind | undefined {
    if (!mime) return undefined;
    const hit = mimeToKindRules.find(([re]) => re.test(mime));
    return hit?.[1];
}

export function kindFromExt(filename: string): ViewerKind | undefined {
    
    if (!filename) return undefined;
    
    const ext = (filename.split(".").pop() || "").toLowerCase();
    return extToKind[ext];
}

export function chooseViewerKind(opts: { contentType?: string; filename: string }): ViewerKind {
    return kindFromMime(opts.contentType) ?? kindFromExt(opts.filename) ?? "binary";
}

/////

// ~5MB guard for inline text previews (tweak to taste)
const TEXT_MAX_BYTES = 5 * 1024 * 1024;

type MediaProps = { bucket: string; objectKey: string; filename?: string };

export function ObjectPreview({ bucket, objectKey, filename }: MediaProps) {
    const [state, setState] = React.useState<{
        url?: string;
        contentType?: string;
        contentLength?: number;
        error?: string;
    }>({});
    const name = filename ?? objectKey.split("/").pop() ?? objectKey;

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const head = await APIWrapperService.GetObjectHead(bucket, objectKey);
                const url = await APIWrapperService.GetPreSignedUrl(bucket, objectKey);
                if (!head) return;
                if (!url) return;
                if (!mounted) return;
                setState({
                    url,
                    contentType: head.contentType ?? undefined,
                    contentLength: head.contentLength,
                });
            } catch (e: any) {
                if (!mounted) return;
                setState({ error: e?.message ?? String(e) });
            }
        })();
        return () => { mounted = false; };
    }, [bucket, objectKey]);

    if (state.error) return <div className="p-4 text-red-600">Failed to load: {state.error}</div>;
    if (!state.url) return <div className="p-4 text-gray-500">Loading preview…</div>;

    const kind = chooseViewerKind({ contentType: state.contentType, filename: name });

    // Large text/code files should not be slurped fully
    const tooLargeForInlineText =
        (kind === "text" || kind === "code" || kind === "json" || kind === "csv" || kind === "markdown" || kind === "html")
        && (state.contentLength ?? 0) > TEXT_MAX_BYTES;

    if (tooLargeForInlineText) {
        return (
            <BinaryFallback
                filename={name}
                contentType={state.contentType}
                contentLength={state.contentLength}
                url={state.url}
                reason="File too large for inline text preview."
            />
        );
    }

    switch (kind) {
        case "image":    return <ImageViewer url={state.url} alt={name} />;
        case "video":    return <VideoViewer url={state.url} />;
        case "audio":    return <AudioViewer url={state.url} />;
        case "pdf":      return <PdfViewer url={state.url} />;
        // case "markdown": return <MarkdownViewer url={state.url} />;
        case "text":     return <TextViewer url={state.url} />;
        case "code":     return <CodeViewer url={state.url} filename={name} />;
        case "csv":      return <CsvViewer url={state.url} />;
        case "json":     return <JsonViewer url={state.url} />;
        case "html":     return <HtmlViewer url={state.url} sandbox />;
        default:
            return (
                <BinaryFallback
                    filename={name}
                    contentType={state.contentType}
                    contentLength={state.contentLength}
                    url={state.url}
                />
            );
    }
}


/////

type MediaViewerModalProps = {
    onClose: () => void;
    bucket: string;
    objectKey: string;
}

export default function MediaViewerModal(props: MediaViewerModalProps) {
    return <div onClick={props.onClose} className="position-absolute d-flex align-items-center justify-content-center"
                style={{top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(255,255,255,0.5)', zIndex: 300}}>
        <div className="d-flex flex-column shadow-lg bg-dark rounded-3 p-3" style={{width: '100%', maxWidth: '90vw', maxHeight: '75vh', height: '100vh'}}
             onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <p className="my-0 fs-4">Preview</p>
                </div>

                <div onClick={props.onClose} style={{cursor: 'pointer'}}><Icon name={'close'} className={'fs-4'}/></div>
            </div>
            
            <div className="flex-fill bg-lighter p-2 rounded-3 shadow-lg overflow-hidden">
                { props.bucket && props.objectKey && <ObjectPreview bucket={props.bucket} objectKey={props.objectKey} /> }
            </div>

            <div className="mt-3 d-flex align-items-center justify-content-between w-100">
                <button className="me-auto ms-0 d-block btn btn-outline-warning" onClick={props.onClose}>Close</button>
            </div>
        </div>
    </div>
}
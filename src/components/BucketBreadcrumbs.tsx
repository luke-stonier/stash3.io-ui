import BucketService from "../services/BucketService";
import React, { useLayoutEffect, useRef } from "react";

type BucketBreadcrumbsProps = {
    bucketId: string;
    path: string;
    onChange: (newPath: string) => void;
};

export default function BucketBreadcrumbs({ bucketId, path, onChange }: BucketBreadcrumbsProps) {
    const breadcrumbClasses = "lh-sm d-block text-truncate bc-item";

    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef({
        isDown: false,
        startX: 0,
        startY: 0,
        startTime: 0,
        scrollStart: 0,
        moved: false,
        cancelled: false,
        downCrumb: null as HTMLElement | null, // <- store pressed crumb
    });

    useLayoutEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        requestAnimationFrame(() => {
            el.scrollLeft = el.scrollWidth;
        });
    }, [path]);

    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const el = scrollerRef.current;
        if (!el) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;

        // store the crumb we started on (before pointer capture changes targets)
        const target = e.target as HTMLElement | null;
        dragRef.current.downCrumb =
            target?.closest<HTMLElement>("[data-prefix], [data-root='true']") ?? null;

        dragRef.current.isDown = true;
        dragRef.current.moved = false;
        dragRef.current.cancelled = false;
        dragRef.current.startX = e.clientX;
        dragRef.current.startY = e.clientY;
        dragRef.current.startTime = performance.now();
        dragRef.current.scrollStart = el.scrollLeft;

        el.setPointerCapture?.(e.pointerId);
        el.style.cursor = "grabbing";
    };

    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const el = scrollerRef.current;
        if (!el || !dragRef.current.isDown) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        if (Math.hypot(dx, dy) > 5) dragRef.current.moved = true;
        el.scrollLeft = dragRef.current.scrollStart - dx;
    };

    const finishGesture = (e: React.PointerEvent, cancelOnly = false) => {
        const el = scrollerRef.current;
        if (el) {
            try { el.releasePointerCapture?.(e.pointerId); } catch {}
            el.style.cursor = "";
        }
        dragRef.current.isDown = false;
        if (cancelOnly) dragRef.current.cancelled = true;
    };

    const onPointerLeave: React.PointerEventHandler<HTMLDivElement> = (e) => {
        finishGesture(e, true);
    };

    const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
        finishGesture(e, true);
    };

    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const el = scrollerRef.current;
        if (!el) return;

        const { moved, cancelled, startX, startY, startTime, downCrumb } = dragRef.current;
        finishGesture(e);

        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (cancelled || moved) return;

        // tap thresholds
        const dt = performance.now() - startTime;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (dt > 300 || Math.hypot(dx, dy) > 5) return;

        // Use the crumb captured on pointerdown (reliable with pointer capture)
        if (!downCrumb) return;

        if (downCrumb.dataset.root === "true") {
            onChange("");
            BucketService.SetBucketAndPath(bucketId, "");
            return;
        }

        const prefix = downCrumb.dataset.prefix;
        if (!prefix) return;
        onChange(prefix);
        BucketService.SetBucketAndPath(bucketId, prefix);
    };

    const scrollerStyle: React.CSSProperties = {
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
        userSelect: "none",
        touchAction: "pan-y", // allow page to scroll vertically
        cursor: dragRef.current.isDown ? "grabbing" : "grab",
    };

    return (
        <div
            ref={scrollerRef}
            className="d-flex align-items-center gap-1 my-2 no-scrollbar"
            style={scrollerStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            onPointerCancel={onPointerCancel}
        >
            {path === "" ? (
                <small className="text-muted" style={{ userSelect: "none" }}>
                    (root)
                </small>
            ) : (
                <>
                    <div
                        className="text-white"
                        style={{ userSelect: "none", cursor: "pointer" }}
                        data-root="true"
                    >
                        <small className={breadcrumbClasses}>(root)</small>
                    </div>
                    <small className="text-muted lh-sm d-block">/</small>

                    {path
                        .split("/")
                        .filter((p) => p !== "")
                        .map((part, index, arr) => {
                            const isLast = index === arr.length - 1;
                            const prefix = arr.slice(0, index + 1).join("/") + "/";
                            return (
                                <React.Fragment key={prefix}>
                                    <div
                                        className={isLast ? "text-muted" : "text-white"}
                                        style={{ userSelect: "none", cursor: isLast ? "" : "pointer" }}
                                        {...(!isLast ? { "data-prefix": prefix } : {})}
                                    >
                                        <small className={breadcrumbClasses}>{part}</small>
                                    </div>
                                    <small className="text-muted lh-sm d-block">{isLast ? "" : "/"}</small>
                                </React.Fragment>
                            );
                        })}
                </>
            )}
        </div>
    );
}

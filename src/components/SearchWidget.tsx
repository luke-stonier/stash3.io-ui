import Icon from "./Icon";
import useGlobalShortcut from "../hooks/useGlobalShortcut";
import React, {useEffect, useMemo, useRef, useState} from "react";
import BucketService, {IBookmarkedItem} from "../services/BucketService";
import BucketObject from "../Models/BucketObject";
import {useDebounce} from "../hooks/useDebounce";
import Bucket from "../Models/Bucket";
import {Button} from "./Button";
import {useNavigate} from "react-router-dom";

interface ISearchResult {
    type: 'bucket' | 'path' | 'item';
    bucket: string;
    path?: string;
    name: string;

    route: string;
    origin: string;
}

export default function SearchWidget(props: { showCloseButton?: boolean, onClose?: () => void }) {

    const rounding = '15px'
    const navigate = useNavigate();
    const inputElementRef = useRef(null);
    const [searchInput, setSearchInput] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState<ISearchResult[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [activeIndex, setActiveIndex] = useState<number>(-1); // -1 = input focused / none selected
    const resultRefs = useRef<(HTMLElement | null)[]>([]);

    useEffect(() => {
        setActiveIndex(results.length ? 0 : -1);
    }, [results]);

    // Ensure the active item is visible when it changes
    useEffect(() => {
        if (activeIndex >= 0) {
            const el = resultRefs.current[activeIndex];
            if (el) el.scrollIntoView({block: "nearest"});
        }
    }, [activeIndex]);

    const inputClickHandler = (e: React.MouseEvent) => {
        e.stopPropagation();
    }

    useEffect(() => {
        setTimeout(() => {
            if (inputElementRef.current) {
                (inputElementRef.current as unknown as HTMLInputElement).focus();
            }
        }, 50);
    }, [])

    const debouncedSearch = useDebounce(searchInput, 300);

    useEffect(() => {
        setResults([])

        const bookmarks = BucketService.GetAllBookmarks();
        const filteredBookmarks = bookmarks.filter(b =>
            filterMethod(debouncedSearch, b.value)
        );

        const mappedBookmarks: ISearchResult[] = filteredBookmarks.map(b => {
            return {
                type: b.type,
                bucket: b.type === 'bucket' ? b.value : b.value.split('/')[0],
                path: b.type === 'path' ? b.value.split('/')[0] : b.value,
                name: b.value,
                origin: 'bookmark',
                route: b.value,
            } as ISearchResult;
        });

        BucketService.GetCurrentObjects(
            (error: string | undefined, objects: BucketObject[]) => {
                const filteredObjects = objects.filter(o =>
                    filterMethod(debouncedSearch, o.key)
                );

                const mappedObjects: ISearchResult[] = filteredObjects.map(o => {
                    return {
                        type: o.isDirectory() ? 'path' : 'item',
                        bucket: BucketService.currentBucket,
                        path: o.key,
                        name: o.displayName(BucketService.currentPath),
                        origin: searchInput === '' ? 'location' : 'search',
                        route: o.key
                    } as ISearchResult;
                });

                if (error) {
                    setSearchError(error);
                } else {
                    setSearchError(null);
                }

                const finalRes = [...mappedBookmarks, ...mappedObjects];

                // sort results by origin, then by type (bucket, path, item), then by name
                // bookmark -> bucket -> path -> item -> name
                finalRes.sort((a, b) => {
                    if (a.origin !== b.origin) {
                        if (a.origin === 'bookmark') return -1;
                        if (b.origin === 'bookmark') return 1;
                        if (a.origin === 'location') return -1;
                        if (b.origin === 'location') return 1;
                        return 0;
                    }
                    if (a.type !== b.type) {
                        const typeOrder = {'bucket': 1, 'path': 2, 'item': 3};
                        return (typeOrder as any)[a.type] - (typeOrder as any)[b.type];
                    }
                    return a.name.localeCompare(b.name);
                });

                setResults(finalRes);
                setShowResults(true);
            }
        );
    }, [debouncedSearch]);

    const filterMethod = (search: string, item: string) => {
        if (item.toLowerCase().includes(search.toLowerCase())) return true;

        const cleanedSearch = search.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const cleanedItem = item.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return cleanedItem.includes(cleanedSearch)
    }

    const gotoResult = (result: ISearchResult) => {
        let bucket = '';
        let path = '';
        let itemName = '';

        if (result.origin === 'bookmark') {
            const firstSlashPos = result.route.indexOf('/');
            if (firstSlashPos > -1) {
                bucket = result.route.substring(0, firstSlashPos);
                path = result.route.substring(firstSlashPos + 1);

                if (result.type === 'item') {
                    const lastSlashPos = path.lastIndexOf('/');
                    if (lastSlashPos > -1) {
                        itemName = path.substring(lastSlashPos + 1);
                        path = path.substring(0, lastSlashPos);
                    } else {
                        itemName = path;
                        path = '';
                    }
                }

            }
            
            // switch on bookmark type
            switch (result.type) {
                case 'bucket':
                    navigate(`/buckets/${result.bucket}`);
                    BucketService.SetBucketAndPath(result.bucket, '');
                    break;
                case 'path':
                    navigate(`/buckets/${result.bucket}?prefix=${encodeURIComponent(path)}`);
                    BucketService.SetBucketAndPath(result.bucket, path || '');
                    break;
                case 'item':
                    navigate(`/buckets/${result.bucket}?prefix=${encodeURIComponent(path)}/`);
                    BucketService.SetBucketAndPath(result.bucket, path);
                    setTimeout(() => {
                        BucketService.ViewItem(path + '/' + itemName);
                    }, 500);

                    break;
                default:
                    alert(`Unknown bookmark type: ${result.type}`);
                    break;
            }
        } else {
            const firstSlashPos = result.route.indexOf('/');
            if (firstSlashPos > -1) {
                path = result.route.substring(0, firstSlashPos);
                path += "/" + result.route.substring(firstSlashPos + 1);

                if (result.type === 'item') {
                    const lastSlashPos = path.lastIndexOf('/');
                    if (lastSlashPos > -1) {
                        itemName = path.substring(lastSlashPos + 1);
                        path = path.substring(0, lastSlashPos);
                    } else {
                        itemName = path;
                        path = '';
                    }
                }

            }
            
            if (result.type === 'item') {
                const url = `/buckets/${result.bucket}?prefix=${encodeURIComponent(path || '')}/`
                navigate(url);
                setTimeout(() => {
                    BucketService.ViewItem(path + '/' + itemName);
                }, 500);
            } else {
                const url = `/buckets/${result.bucket}?prefix=${encodeURIComponent(path || '')}`
                navigate(url);
                BucketService.SetBucketAndPath(result.bucket, result.path || '');
            }

            setSearchError(null);
            setResults([])
            props.onClose && props.onClose();
        }
    }

    // KEYBOARD HANDLERS

    // Keyboard handling when typing in the input
    const onInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (!showResults) return;
        
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                if (results.length) setActiveIndex((i) => (i + 1) % results.length);
                break;
            case "ArrowUp":
                e.preventDefault();
                if (results.length) {
                    setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
                }
                break;
            case "Enter":
                if (activeIndex >= 0 && results[activeIndex]) {
                    e.preventDefault();
                    gotoResult(results[activeIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                if (props.onClose) props.onClose();
                break;
        }
    };

    // Keyboard handling when the list container has focus
    const onListKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                if (results.length) setActiveIndex((i) => (i + 1) % results.length);
                break;
            case "ArrowUp":
                e.preventDefault();
                if (results.length) setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
                break;
            case "Home":
                e.preventDefault();
                if (results.length) setActiveIndex(0);
                break;
            case "End":
                e.preventDefault();
                if (results.length) setActiveIndex(results.length - 1);
                break;
            case "Enter":
                if (activeIndex >= 0 && results[activeIndex]) {
                    e.preventDefault();
                    gotoResult(results[activeIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                if (props.onClose) props.onClose();
                break;
        }
    };

    //

    const RenderResults = useMemo(() => {

        return <div key={"searchWidget_renderResult"} className="d-flex flex-column gap-3"
                    role="listbox"
                    aria-activedescendant={activeIndex >= 0 ? `result-${activeIndex}` : undefined}>
            {
                results.map((r, idx) =>
                    <div key={`frag-${idx}`}
                        onMouseEnter={() => {
                                setActiveIndex(idx)
                        }}>
                        <Button staticClasses={`d-flex flex-column w-100 ${idx === activeIndex ? 'btn btn-light' : 'btn-ghost btn-ghost-light'}`}
                                onClick={() => gotoResult(r)}

                                id={`result-${idx}`}
                                ref={(el) => {
                                    resultRefs.current[idx] = el as HTMLElement | null;
                                }}
                        >
                            {/*<div className="w-100 d-flex justify-content-between gap-3 mb-0" style={{fontSize: 12}}>*/}
                            {/*    <small>{ r.origin === 'bookmark' ? r.path : r.path?.replace(r.name, '').replace('//', '/') }</small>*/}
                            {/*    <small>{ r.origin } result</small>*/}
                            {/*</div>*/}
                            <div className="w-100 d-flex align-items-center gap-2">
                                <Icon className={''}
                                      name={r.type === 'bucket' ? 'deployed_code' : r.type === 'path' ? 'arrow_split' : 'contract'}/>
                                <p className="my-0 fs-6 flex-fill text-start lh-sm">{r.name || r.path}</p>

                                {r.origin === 'bookmark' && <Icon className={'text-warning'} filled name={'bookmark'}/>}
                            </div>
                        </Button>

                        {idx < results.length - 1 && <hr className="my-0 text-secondary opacity-10"/>}
                    </div>)
            }
        </div>;

    }, [results, activeIndex]);

    const RenderNoResults = () => {
        return <div className="text-center text-secondary">No results found</div>
    }

    return <div onClick={inputClickHandler} className="w-100 position-relative">

        <div className="d-flex flex-column align-items-stretch">
            {props.showCloseButton &&
                <div className="d-flex align-self-end mb-1 me-2" style={{cursor: 'pointer', userSelect: 'none'}}
                     onClick={() => props.onClose && props.onClose()}>
                    <small className="text-warning">Close</small>
                </div>}
            <div
                style={{
                    borderTopRightRadius: rounding,
                    borderTopLeftRadius: rounding,
                    borderBottomRightRadius: showResults ? '0' : rounding,
                    borderBottomLeftRadius: showResults ? '0' : rounding,
                }}
                className="bg-lighter border-0 w-100 d-flex align-items-center justify-content-start gap-2 px-3 py-2 overflow-hidden">
                <Icon name="search"/>
                <input ref={inputElementRef} className="bg-transparent text-white border-0 flex-fill"
                       placeholder='Search buckets or files...'
                       value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                       onKeyDown={onInputKeyDown}
                       aria-controls="results-list"
                       aria-autocomplete="list"
                       role="combobox"
                       aria-expanded={showResults}                />
                {props.showCloseButton && <div className="d-flex" style={{cursor: 'pointer', userSelect: 'none'}}
                                               onClick={() => setSearchInput('')}><Icon name="close"/></div>}
            </div>
        </div>
        {showResults &&
            <div className="position-absolute top-100 start-0 end-0 bg-dark px-3 py-4"
                 style={{
                     maxHeight: '600px',
                     overflowY: 'auto',
                     borderBottomRightRadius: rounding,
                     borderBottomLeftRadius: rounding,
                 }}
                 tabIndex={0}
                 onKeyDown={onListKeyDown}>
                {results.length > 0 ? RenderResults : RenderNoResults()}
                {searchError && <div className="mt-3 text-center text-secondary">{searchError}</div>}
            </div>
        }
    </div>;
}

export function SearchWidgetModal() {

    const [modalActive, setModalActive] = useState(false);

    useGlobalShortcut([
        {key: 't', ctrl: true},
        {key: 't', meta: true},
        {key: 'f', ctrl: true},
        {key: 'f', meta: true}
    ], () => {
        setModalActive(!modalActive);
    });

    useGlobalShortcut([{key: 'escape'}], () => setModalActive(false));

    if (!modalActive) return <></>

    return <div
        className="position-absolute d-flex align-items-stretch justify-content-center top-0 end-0 start-0 bottom-0"
        style={{backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1050}} onClick={() => setModalActive(false)}>
        <div className="position-absolute p-5  w-100" style={{maxWidth: 600, top: '25%'}}>
            <SearchWidget showCloseButton onClose={() => setModalActive(false)}/>
        </div>
    </div>;
}
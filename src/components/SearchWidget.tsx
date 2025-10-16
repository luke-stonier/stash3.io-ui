import Icon from "./Icon";
import useGlobalShortcut from "../hooks/useGlobalShortcut";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import BucketService from "../services/BucketService";
import BucketObject from "../Models/BucketObject";
import {useDebounce} from "../hooks/useDebounce";
import {Button} from "./Button";
import {useNavigate} from "react-router-dom";
import UserService from "../services/user-service";

interface ISearchResultGroup {
    groupName: string;
    results: ISearchResult[];
    resultCount: number;
}

interface ISearchResult {
    id: number;
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
    const [allBuckets, setAllBuckets] = useState<{ bookmarked: boolean, id: string, bucket: string }[]>([]);
    const [searchInput, setSearchInput] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState<ISearchResultGroup[]>([]);
    const [resultLength, setResultLength] = useState(0);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [activeIndex, setActiveIndex] = useState<number>(-1); // -1 = input focused / none selected
    const resultRefs = useRef<(HTMLElement | null)[]>([]);

    useEffect(() => {
        setResults([]);
        setAllBuckets([]);
    }, []);

    const LoadBuckets = async () => {
        BucketService.GetAllBuckets().then(buckets => {
            setAllBuckets(buckets);
        });
    }
    
    useEffect(() => {
        (async () => await LoadBuckets())();

        const accountChangeSub = UserService.changeAWSAccountEvent.subscribe(() => {
            (async () => await LoadBuckets())();
        });
        
        return () => {
            UserService.changeAWSAccountEvent.unsubscribe(accountChangeSub);
        }
    }, []);

    useEffect(() => {
        setActiveIndex(resultLength ? 0 : -1);
        setResultLength(results.map(r => r.resultCount).reduce((a, b) => a + b, 0));
    }, [results, resultLength]);

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
        setResults([]);
        let index = 0;

        const buckets = [...allBuckets];
        const filteredBuckets = buckets.filter(b => BucketService.currentBucket !== b.bucket && !b.bookmarked && filterMethod(debouncedSearch, b.bucket)); // filter out bookmarked buckets, as they are shown in bookmarks section

        const bookmarks = BucketService.GetAllBookmarks();
        const filteredBookmarks = bookmarks.filter(b =>
            filterMethod(debouncedSearch, b.value)
        );

        const currentPath = "./" + BucketService.currentPath;
        const upPath = currentPath === './' ? '' : currentPath.split('/').slice(0, -2).join('/') + '/';
        const safeUpPath = upPath.startsWith('./') ? upPath.substring(2) : upPath;

        const pathActions: ISearchResult[] = []
        if (BucketService.currentPath !== '' && searchInput === '') {
            pathActions.push({
                id: index,
                type: 'path',
                bucket: BucketService.currentBucket,
                path: safeUpPath,
                name: 'up to ' + (safeUpPath || '(root)'),
                origin: 'action',
                route: safeUpPath,
            })
            
            index++;
        }

        const mappedBookmarks: ISearchResult[] = filteredBookmarks.map(b => {
            const resp = {
                type: b.type,
                bucket: b.type === 'bucket' ? b.value : b.value.split('/')[0],
                path: b.type === 'path' ? b.value.split('/')[0] : b.value,
                name: b.value,
                origin: 'bookmark',
                route: b.value,
                id: index
            } as ISearchResult;

            index++;
            return resp;
        });

        BucketService.GetCurrentObjects(
            (error: string | undefined, objects: BucketObject[]) => {
                const filteredObjects = objects.filter(o =>
                    filterMethod(debouncedSearch, o.key) && o.key !== BucketService.currentPath
                );

                const mappedObjects: ISearchResult[] = filteredObjects.map(o => {
                    const resp = {
                        type: o.isDirectory() ? 'path' : 'item',
                        bucket: BucketService.currentBucket,
                        path: o.key,
                        name: o.displayName(BucketService.currentPath),
                        origin: searchInput === '' ? 'location' : 'search',
                        route: o.key,
                        id: index
                    } as ISearchResult;

                    index++;
                    return resp;
                });

                mappedObjects.sort((a, b) => {
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

                const mappedBuckets = filteredBuckets.map(b => {
                    const resp = {
                        type: 'bucket',
                        bucket: b.bucket,
                        path: b.bucket,
                        name: b.bucket,
                        origin: 'bucket',
                        route: b.bucket,
                        id: index
                    } as ISearchResult;

                    index++;
                    return resp;
                });

                if (error) {
                    setSearchError(error);
                } else {
                    setSearchError(null);
                }

                const finalRes = [
                    {groupName: 'Actions', results: pathActions, resultCount: pathActions.length},
                    {groupName: 'Bookmarks', results: mappedBookmarks, resultCount: mappedBookmarks.length},
                    {groupName: 'Current Location', results: mappedObjects, resultCount: mappedObjects.length},
                    
                    {groupName: 'Buckets', results: mappedBuckets, resultCount: mappedBuckets.length},
                ];


                setResults(finalRes);
                setShowResults(true);
            }
        );
        // eslint-disable-next-line
    }, [debouncedSearch, allBuckets]);

    const filterMethod = (search: string, item: string) => {
        if (item.toLowerCase().includes(search.toLowerCase())) return true;

        const cleanedSearch = search.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const cleanedItem = item.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return cleanedItem.includes(cleanedSearch)
    }

    const gotoResult = useCallback((result: ISearchResult | null) => {
        if (!result) return;

        let path = '';
        let itemName = '';

        if (result.origin === 'bookmark') {
            const firstSlashPos = result.route.indexOf('/');
            if (firstSlashPos > -1) {
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
                    BucketService.SetBucketAndPath(result.bucket, path + "/");
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
                BucketService.SetBucketAndPath(result.bucket, path + '/');
                navigate(url);
                console.log(url);
                setTimeout(() => {
                    BucketService.ViewItem(path + '/' + itemName);
                }, 500);
            } else {
                const url = `/buckets/${result.bucket}?prefix=${encodeURIComponent(path || '')}`
                BucketService.SetBucketAndPath(result.bucket, path || '');
                navigate(url);
            }
        }

        setSearchError(null);
        setResults([])
        props.onClose && props.onClose();
    }, [navigate, props]);

    // KEYBOARD HANDLERS

    // Keyboard handling when typing in the input
    const onInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (!showResults) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                if (resultLength) setActiveIndex((i) => (i + 1) % resultLength);
                break;
            case "ArrowUp":
                e.preventDefault();
                if (resultLength) {
                    setActiveIndex((i) => (i <= 0 ? resultLength - 1 : i - 1));
                }
                break;
            case "Enter":
                if (activeIndex >= 0) {
                    e.preventDefault();
                    gotoResult(getResultByIndex(activeIndex));
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
                if (resultLength) setActiveIndex((i) => (i + 1) % resultLength);
                break;
            case "ArrowUp":
                e.preventDefault();
                if (resultLength) setActiveIndex((i) => (i <= 0 ? resultLength - 1 : i - 1));
                break;
            case "Home":
                e.preventDefault();
                if (resultLength) setActiveIndex(0);
                break;
            case "End":
                e.preventDefault();
                if (resultLength) setActiveIndex(resultLength - 1);
                break;
            case "Enter":
                if (activeIndex >= 0) {
                    e.preventDefault();
                    gotoResult(getResultByIndex(activeIndex));
                }
                break;
            case "Escape":
                e.preventDefault();
                if (props.onClose) props.onClose();
                break;
        }
    };

    const getResultByIndex = (index: number): ISearchResult | null => {
        for (const group of results) {
            for (const item of group.results) {
                if (item.id === index) return item;
            }
        }
        return null;
    }

    //

    const RenderResults = useMemo(() => {
        const ResultItem = ({result, idx}: { result: ISearchResult, idx: number }) => {
            return <div onMouseEnter={() => {
                setActiveIndex(idx)
            }}>
                <Button
                    staticClasses={`d-flex flex-column w-100 btn-ghost btn-ghost-light ${idx === activeIndex ? 'active' : ''}`}
                    onClick={() => gotoResult(result)}
                    id={`result-${idx}`}
                    ref={(el) => {
                        resultRefs.current[idx] = el as HTMLElement | null;
                    }}
                >
                    <div className="w-100 d-flex align-items-center gap-2">
                        <Icon className={''}
                              name={result.type === 'bucket' ? 'deployed_code' : result.type === 'path' ? 'arrow_split' : 'contract'}/>
                        <p className="my-0 fs-6 flex-fill text-start lh-sm">{result.name || result.path}</p>

                        {result.origin === 'bookmark' && <Icon className={'text-warning'} filled name={'bookmark'}/>}
                    </div>
                </Button>
            </div>
        }

        return <div key={"searchWidget_renderResult"} className="d-flex flex-column"
                    role="listbox">
            {
                results.map((r, idx) =>
                    <div key={'search_group_' + r.groupName} className={`mb-4 ${r.resultCount > 0 ? '' : 'd-none'}`}>
                        <div className={'d-flex align-items-center justify-content-between mb-2'}>
                            <span>{r.groupName}</span><span className="text-muted small">({r.resultCount})</span></div>
                        {r.results.map((item, i) =>
                            <div key={item.id + "_result_group_" + r.groupName}>
                                {ResultItem({result: item, idx: item.id})}
                                <hr className="my-2 text-secondary opacity-10"/>
                            </div>)
                        }
                    </div>
                )
            }
        </div>;

    }, [results, activeIndex, gotoResult]);

    const RenderNoResults = () => {
        return <div className="text-center text-secondary">No results found</div>
    }

    return <div onClick={inputClickHandler} className="w-100 position-relative">

        <div className="d-flex flex-column align-items-stretch">
            {props.showCloseButton &&
                <div className="d-flex align-self-end align-items-center gap-1 mb-1 me-2" style={{cursor: 'pointer', userSelect: 'none'}}
                     onClick={() => props.onClose && props.onClose()}>
                    <small className="fs-6 text-warning">Close</small>
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
                       placeholder={'Search buckets or files...'}
                       value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                       onKeyDown={onInputKeyDown}
                       aria-controls="results-list"
                       aria-autocomplete="list"
                       role="combobox"
                       aria-expanded={showResults}/>
                {props.showCloseButton && <div className="d-flex" style={{cursor: 'pointer', userSelect: 'none'}}
                                               onClick={() => setSearchInput('')}><Icon className={'fs-6'} name="cancel"/></div>}
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
                {resultLength > 0 ? RenderResults : RenderNoResults()}
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
        style={{backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1050}} onClick={() => setModalActive(false)}>
        <div className="position-absolute p-5  w-100" style={{maxWidth: 600, top: '25%'}}>
            <SearchWidget showCloseButton onClose={() => setModalActive(false)}/>
        </div>
    </div>;
}
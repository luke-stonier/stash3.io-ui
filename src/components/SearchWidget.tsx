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
        
        console.log('bookmarks->', filteredBookmarks);

        const mappedBookmarks: ISearchResult[] = filteredBookmarks.map(b => {
            return {
                type: b.type,
                bucket: b.type === 'bucket' ? b.value : b.value.split('/')[0],
                path: b.type === 'path' ? b.value.split('/')[0] : b.value,
                name: b.value,
                origin: 'bookmark',
                route: '',
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
                console.log('end results->', finalRes);
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
        
        console.log(result);
        
        if (result.origin === 'bookmark') {
            const firstSlashPos = result.route.indexOf('/');
            let bucket = '';
            let path = '';
            let itemName = '';
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

            } else {
                bucket = result.route;
            }

            // switch on bookmark type
            switch (result.type) {
                case 'bucket':
                    navigate(`/buckets/${bucket}`);
                    break;
                case 'path':
                    navigate(`/buckets/${bucket}?prefix=${encodeURIComponent(path)}`);
                    break;
                case 'item':
                    navigate(`/buckets/${bucket}?prefix=${encodeURIComponent(path)}/`);
                    setTimeout(() => {
                        BucketService.ViewItem(path + '/' + itemName);
                    }, 500);

                    break;
                default:
                    alert(`Unknown bookmark type: ${result.type}`);
                    break;
            }
        } else {
            // check if item or folder
            // then we navigate to that folder, and if item, we open the viewer
            const url = `/buckets/${result.bucket}?prefix=${encodeURIComponent(result.path || '')}`
            console.log(url);
            navigate(url);
            BucketService.SetBucketAndPath(result.bucket, result.path || '');
            if (result.type === 'item') {
                setTimeout(() => {
                    BucketService.ViewItem(result.path || '');
                }, 500);
            }
            
            setSearchError(null);
            setResults([])
            props.onClose && props.onClose();
        }
    }
    
    const RenderResults = useMemo(() => {
        
        return <div key={"searchWidget_renderResult"} className="d-flex flex-column gap-3">
            {
                results.map((r, idx) => <>
                    <Button key={idx} staticClasses="d-flex flex-column btn-ghost btn-ghost-warning w-100"
                            onClick={() => gotoResult(r)}
                    >
                        <div className="w-100 d-flex justify-content-between gap-3 mb-0" style={{fontSize: 12}}>
                            <small>{ r.origin === 'bookmark' ? r.path : r.path?.replace(r.name, '').replace('//', '/') }</small>
                            <small>{ r.origin } result</small>
                        </div>
                        <div className="w-100 d-flex align-items-center gap-2">
                            <Icon className={''}
                                  name={r.type === 'bucket' ? 'deployed_code' : r.type === 'path' ? 'arrow_split' : 'contract'}/>
                            <div className="text-truncate">{r.name || r.path}</div>
                        </div>
                    </Button>
                    
                    { idx < results.length - 1 && <hr className="my-0 text-secondary opacity-10" /> }
                </>)
            }
        </div>;
        
    }, [results]);
    
    const RenderNoResults = () => {
        return <div className="text-center text-secondary">No results found</div>
    }

    return <div onClick={inputClickHandler} className="w-100 position-relative">

        <div className="d-flex flex-column align-items-stretch">
        {props.showCloseButton && <div className="d-flex align-self-end mb-1 me-2" style={{cursor: 'pointer', userSelect: 'none'}}
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
                />
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
                 }}>
                { results.length > 0 ? RenderResults : RenderNoResults() }
                { searchError && <div className="text-center text-secondary">{searchError}</div> }
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
        <div className="position-absolute p-5  w-100" style={{maxWidth: 600, top: '25%' }}>
            <SearchWidget showCloseButton onClose={() => setModalActive(false)}/>
        </div>
    </div>;
}
import React, {useCallback, useEffect, useState} from "react";
import {IBookmarkedItem} from "../services/BucketService";
import BucketService from "../services/BucketService";
import Icon from "../components/Icon";
import {useNavigate} from "react-router-dom";
import {IconButton} from "../components/Button";
import {ConfirmationService} from "../services/Overlays";

export default function Bookmarks() {

    const navigate = useNavigate();
    const [bookmarks, setBookmarks] = useState<IBookmarkedItem[]>(BucketService.GetAllBookmarks());
    const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<string[]>([]);

    useEffect(() => {
        const BRE = BucketService.bucketRefreshEvent.subscribe(() => {
            setSelectedBookmarkIds([]);
            setBookmarks(BucketService.GetAllBookmarks());
        });

        return () => {
            BucketService.bucketRefreshEvent.unsubscribe(BRE);
        }
    }, [])

    const toggleSelected = (clickEvent: React.MouseEvent, id: string) => {
        clickEvent.preventDefault(); // prevents row click
        clickEvent.stopPropagation(); // prevents row click

        const index = selectedBookmarkIds.findIndex(sid => sid === id);
        if (index > -1) {
            const newSelected = [...selectedBookmarkIds];
            newSelected.splice(index, 1);
            setSelectedBookmarkIds(newSelected);
        } else {
            setSelectedBookmarkIds([...selectedBookmarkIds, id]);
        }
    }

    const toggleSelectAll = () => {
        if (selectedBookmarkIds.length === bookmarks.length) {
            setSelectedBookmarkIds([]);
        } else {
            const allIds = bookmarks.map((b, index) => 'bookmark-' + index);
            setSelectedBookmarkIds(allIds);
        }
    }

    const gotoBookmark = (clickEvent: React.MouseEvent, bookmark: IBookmarkedItem) => {

        // get bucket, path, itemName from bookmark.value
        clickEvent.preventDefault(); // prevents row click
        clickEvent.stopPropagation(); // prevents row click
        if (selectedBookmarkIds.length > 0) return; // do not navigate if selection is active

        const firstSlashPos = bookmark.value.indexOf('/');
        let bucket = '';
        let path = '';
        let itemName = '';
        if (firstSlashPos > -1) {
            bucket = bookmark.value.substring(0, firstSlashPos);
            path = bookmark.value.substring(firstSlashPos + 1);

            if (bookmark.type === 'item') {
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
            bucket = bookmark.value;
        }

        // switch on bookmark type
        switch (bookmark.type) {
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
                alert(`Unknown bookmark type: ${bookmark.type}`);
                break;
        }
    }

    const headerIcon = () => {
        const allSelected = selectedBookmarkIds.length === bookmarks.length && bookmarks.length > 0;
        const noneSelected = selectedBookmarkIds.length === 0;
        const someSelected = !allSelected && !noneSelected;

        return <Icon className={`fs-2 my-0 ${allSelected || someSelected ? 'text-warning' : 'text-white'}`}
                     name={noneSelected ? 'check_box_outline_blank' : allSelected ? 'check_box' : 'indeterminate_check_box'}
                     filled={allSelected || someSelected}
        />
    }
    
    const deleteSelected = useCallback(() => {
        ConfirmationService.Add({
            title: `Delete Bookmarks`,
            children: <div>
                Are you sure you want to delete the selected bookmarks?
            </div>,
            cancelColor: 'outline-light',
            confirmColor: 'danger',
            onClose: (status: boolean) => {
                if (!status) return;
                
                selectedBookmarkIds.forEach((id: string, idx: number) => {
                    const index = parseInt(id.replace('bookmark-', ''));
                    const bookmark = bookmarks[index];
                    BucketService.RemoveGlobalBookmark(bookmark);
                });
            }
        })
    }, [bookmarks, selectedBookmarkIds]);

    const deleteSingle = (bookmark: IBookmarkedItem) => {

        ConfirmationService.Add({
            title: `Delete Bookmark`,
            children: <div>
                Are you sure you want to delete the bookmark for <strong>{bookmark.value}</strong>
            </div>,
            cancelColor: 'outline-light',
            confirmColor: 'danger',
            onClose: (status: boolean) => {
                if (!status) return;
                BucketService.RemoveGlobalBookmark(bookmark);
            }
        })

        const newBookmarks = bookmarks.filter((b, index) => {
            const id = 'bookmark-' + index;
            return selectedBookmarkIds.findIndex(sid => sid === id) === -1;
        });
        localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
        BucketService.bucketRefreshEvent.emit();
        setSelectedBookmarkIds([]);
    }

    if (bookmarks.length === 0) {
        return <div className="pt-5 d-flex flex-column align-items-center justify-content-center h-100">
            <Icon name={'bookmark'} className={'text-secondary'} style={{fontSize: '6rem'}}/>
            <h3 className="text-secondary">No bookmarks yet</h3>
            <p className="text-secondary text-center">You can bookmark buckets and paths for quick access.<br/>Use the
                bookmark icon in the bucket or path context menu to add bookmarks.</p>
        </div>;
    }

    return <div>
        <table className="table table-dark table-hover">
            <thead>
            <tr style={{height: 1}}>
                <th style={{height: 'inherit'}}>
                    <div className="h-100 d-flex justify-content-center align-items-center">
                        <button onClick={(e) => {
                            toggleSelectAll()
                        }} className="bg-transparent border-0 p-0 m-0 d-flex">
                            {headerIcon()}
                        </button>
                    </div>
                </th>
                <th style={{height: 'inherit'}}>
                    <div className="d-flex justify-content-between align-items-center">
                        <p className="my-0 fs-3">Bookmarks</p>
                        <IconButton
                            staticClasses={'btn btn-outline-warning gap-1'}
                            disabled={selectedBookmarkIds.length === 0}
                                    iconClasses={'fs-4 p-0'}
                                    icon={'delete'}
                                    iconFirst={true}
                                    onClick={deleteSelected}
                        >
                            <span>Delete {selectedBookmarkIds.length} Item{selectedBookmarkIds.length === 1 ? '' : 's'}</span>
                        </IconButton>
                    </div>
                </th>
            </tr>
            </thead>
            <tbody>
            {
                bookmarks.map((b, index) => {
                    const id = 'bookmark-' + index;
                    const selected = selectedBookmarkIds.findIndex(sbi => sbi === id) > -1;
                    return <tr key={id} className="p-2" onClick={(e) => {
                        gotoBookmark(e, b)
                    }} style={{cursor: 'pointer', userSelect: 'none', height: 1}}>
                        <td style={{width: '50px', height: 'inherit'}}>
                            <div style={{height: '100%'}} className="d-flex align-items-center">
                                <button onClick={(e) => {
                                    toggleSelected(e, id)
                                }} className="bg-transparent border-0 p-0 m-0 d-flex">
                                    <Icon className={`fs-2 my-0 ${selected ? 'text-warning' : 'text-white'}`}
                                          name={selected ? 'check_circle' : 'circle'} filled={selected}
                                    />
                                </button>
                            </div>
                        </td>
                        <td>
                            <div className="d-flex align-items-center justify-content-start gap-3 w-100">
                                <Icon className={'fs-2 text-warning'}
                                      name={b.type === 'bucket' ? 'deployed_code' : b.type === 'path' ? 'arrow_split' : 'contract'}/>
                                <span className={'fs-6'}>{b.value}</span>

                                <div className="flex-fill"></div>

                                <IconButton iconClasses={'fs-3 btn-ghost btn-ghost-warning p-0'}
                                            icon={'delete'}
                                            iconFirst={false}
                                            onClick={() => deleteSingle(b)}
                                >
                                </IconButton>
                            </div>
                        </td>
                    </tr>
                })
            }
            </tbody>
        </table>
    </div>;
}
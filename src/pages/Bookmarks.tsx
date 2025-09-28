import {useState} from "react";
import {IBookmarkedItem} from "../services/BucketService";
import BucketService from "../services/BucketService";
import Icon from "../components/Icon";

export default function Bookmarks() {

    const [bookmarks, setBookmarks] = useState<IBookmarkedItem[]>(BucketService.GetAllBookmarks());

    return <div>
        <table className="table table-dark table-hover">
            <tbody>
            {
                bookmarks.map((b, index) => {
                    return <tr key={'bookmark-' + index} className="p-2">
                        <td>
                            <div className="d-flex align-items-center justify-content-start gap-3">
                                <Icon className={'fs-2 text-warning'}
                                      name={b.type === 'bucket' ? 'deployed_code' : b.type === 'path' ? 'arrow_split' : 'contract'}/>
                                <span className={'fs-6'}>{b.id}</span>
                            </div>
                        </td>
                    </tr>
                })
            }
            </tbody>
        </table>
    </div>;
}
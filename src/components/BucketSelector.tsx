import Bucket from "../Models/Bucket";
import Icon from "./Icon";

export default function BucketSelector({ bucket } : { bucket: Bucket }) {
    return <button
        className="btn btn-outline-light text-white rounded-3 p-3 bg-transparent d-flex align-items-center justify-content-center w-100">
        <Icon name={'box'} filled={true} />

        <p className="text-center my-0">{bucket.name}</p>
    </button>
}
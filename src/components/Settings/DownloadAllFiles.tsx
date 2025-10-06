export default function DownloadAllFiles() {
    return <div>
        <p>Select a location to download bucket content locally</p>
        {/*s3 sync from sdk completes this*/}
        <button className="btn btn-success">Download All as ZIP</button>
    </div>
}
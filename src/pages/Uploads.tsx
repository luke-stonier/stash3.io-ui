export default function UploadsPage() {
    return (
        <div className="container-fluid">
            <h1 className="mb-4">Recent Uploads</h1>

            <table className="table table-dark table-striped">
                <thead>
                <tr>
                    <th scope="col">File Name</th>
                    <th scope="col">Size</th>
                    <th scope="col">Uploaded At</th>
                    <th scope="col">Status</th>
                </tr>
                </thead>
                <tbody>
                {/* Example row */}
                <tr>
                    <td>example-file.txt</td>
                    <td>1.2 MB</td>
                    <td>2023-10-01 12:34:56</td>
                    <td>Completed</td>
                </tr>
                {/* More rows can be added dynamically */}
                </tbody>
            </table>
        </div>
    );
}
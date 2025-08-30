export default class BucketObject {
    constructor(init?: Partial<BucketObject>) {
        Object.assign(this, init);
    }

    public etag: string = "";
    public key: string = "";
    public lastModified: Date = new Date(0);
    public size: number = 0;
    public storageClass: string = "";

    public isDirectory = () => this.key.endsWith("/") && this.size === 0;

    public isInDirectory = (prefix: string) => {
        const norm = normalizePrefix(prefix); // "" or "path/"
        const starts = this.key.startsWith(norm);
        const rest = this.key.slice(norm.length);
        if (!starts) return false;

        if (this.isDirectory()) {
            const restNoSlash = rest.replace(/\/$/, "");
            const immediate = !restNoSlash.includes("/");
            // console.log(`dir check → restNoSlash="${restNoSlash}", immediate=${immediate}`);
            return immediate;
        }

        const immediate = !rest.includes("/");
        // console.log(`file check → rest="${rest}", immediate=${immediate}`);
        return immediate;
    };

    /** Basename to display within `prefix` */
    public displayName = (prefix: string) => {
        const norm = normalizePrefix(prefix);
        const rest = this.key.slice(norm.length);
        return this.isDirectory() ? rest.replace(/\/$/, "") : rest;
    };
}

function normalizePrefix(p: string) {
    // root: "", otherwise ensure a single trailing slash and no leading slash
    if (!p) return "";
    return p.replace(/^\/+/, "").replace(/\/+$/, "") + "/";
}

function extractFoldersFromKeys(keys: string[], prefix: string): string[] {
    const norm = prefix ? prefix.replace(/\/+$/, "") + "/" : "";
    const folders = new Set<string>();

    for (const key of keys) {
        if (!key.startsWith(norm)) continue;
        const rest = key.slice(norm.length);
        const first = rest.split("/")[0];
        if (first && rest.includes("/")) {
            folders.add(norm + first + "/");
        }
    }

    return Array.from(folders);
}
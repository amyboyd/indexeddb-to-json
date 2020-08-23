import getFolderSizeWithCallback from 'get-folder-size';
import globWithCallback, {IOptions} from 'glob';

export function timestampForFilename(): string {
    return new Date()
        .toISOString()
        .replace(/[/:]/g, '-')
        .replace(/\.\d+Z$/, '')
        .replace('T', '-at-');
}

export function unique<T>(array: T[]): T[] {
    return Array.from(new Set(array));
}

export async function getFolderSizeInMb(path: string): Promise<number> {
    return new Promise((resolve, reject) => {
        getFolderSizeWithCallback(path, function (err, size) {
            if (err) {
                reject(err);
            } else {
                const sizeInMb: number = size === 0 ? 0 : Number((size / 1024 / 1024).toFixed(1));
                resolve(sizeInMb);
            }
        });
    });
}

export async function globPromise(pattern: string, options: IOptions): Promise<string[]> {
    options = Object.assign({silent: true, strict: false}, options);
    return new Promise((resolve, reject) => {
        globWithCallback(pattern, options, function (err, matches: string[]) {
            if (err) {
                if (err.message.includes('EPERM: operation not permitted')) {
                    err.message +=
                        " (try going to your Mac's System Preferences > Privacy > Full Disk Access, then grant access to Terminal/iTerm)";
                }
                reject(err);
            } else {
                resolve(matches);
            }
        });
    });
}

import {homedir} from 'os';
import {createObjectCsvWriter, createObjectCsvStringifier} from 'csv-writer';
import {timestampForFilename, getFolderSizeInMb, globPromise, unique} from './utils';
import {Database, IndexedDBRoot, IndexedDBType} from '../types';
import extract from './extract';

interface CommandOptions {
    csv?: boolean;
    stdout?: boolean;
    return?: boolean;
    includeDatabaseCounts?: boolean;
}

export default async function discover(options: CommandOptions): Promise<void | IndexedDBRoot[]> {
    const searchPaths = [
        // MacOS:
        `${homedir}/Library`,
        // Windows:
        `${homedir}/AppData`,
        // Linux:
        `${homedir}/.config`,
        // You might also want to search:
        // homedir,
        // MacOS's Time Machine backups:
        // '/Volumes/*/Backups.backupdb/*/*/* - Data/Users/*/Library'
    ];

    const ignoreDirs = ['**/.git/**', '**/node_modules/**'];

    async function findIndexedDbRootsInPath(path: string): Promise<string[]> {
        const roots = await globPromise('**/CURRENT', {
            cwd: path,
            realpath: true,
            nosort: true,
            nodir: true,
            nocase: false,
            dot: true,
            ignore: ignoreDirs,
        });
        return roots.map((file) => file.replace(/\/CURRENT$/, ''));
    }

    searchPaths.forEach((searchPath) => {
        if (!searchPath.startsWith('/')) {
            throw new Error('Search path must start with / but got: ' + searchPath);
        } else if (searchPath.endsWith('/')) {
            throw new Error('Search path must not end with / but got: ' + searchPath);
        }
        console.log('Searching ' + searchPath);
    });

    const globPromises: Promise<string[]>[] = searchPaths.map((searchPath) => {
        return globPromise(searchPath + '/**/*indexeddb*/', {
            realpath: true,
            nosort: true,
            nocase: true,
            dot: true,
            ignore: ignoreDirs,
        });
    });

    const potentialDirsDeep: string[][] = await Promise.all(globPromises);
    let potentialDirs: string[] = potentialDirsDeep
        .filter((dir) => dir.length > 0)
        .reduce((prev, current) => {
            return prev.concat(current);
        }, []);
    potentialDirs = unique(potentialDirs);

    const searchPromises: Promise<string[]>[] = potentialDirs.map(findIndexedDbRootsInPath);
    const indexedDbRootsDeep: string[][] = await Promise.all(searchPromises);
    let indexedDbRootPaths = indexedDbRootsDeep
        .filter((roots: string[]) => roots.length > 0)
        .reduce((prev: string[], current: string[]): string[] => {
            return prev.concat(current);
        }, [] as string[]);
    indexedDbRootPaths = unique(indexedDbRootPaths);
    indexedDbRootPaths = indexedDbRootPaths.sort((a, b) => a.localeCompare(b));

    const indexedDbRoots: IndexedDBRoot[] = await Promise.all(
        indexedDbRootPaths.map(async (directory: string) => {
            const size = await getFolderSizeInMb(directory);
            const type: IndexedDBType = directory.toLowerCase().includes('slack')
                ? 'Slack'
                : directory.toLowerCase().includes('teams')
                ? 'Teams'
                : 'Unknown';
            let extractError = undefined;
            let databaseCount = undefined;
            if (options.includeDatabaseCounts) {
                try {
                    const databases = (await extract(directory, {
                        return: options.return,
                        includeStores: false,
                    })) as Database[];
                    databaseCount = databases.length;
                } catch (e) {
                    extractError = e.message;
                }
            }

            return {directory, size, type, databaseCount, extractError};
        }),
    );

    console.log('Found ' + indexedDbRoots.length + ' IndexedDB root(s)');

    async function printRoots(roots: IndexedDBRoot[]) {
        if (roots.length === 0) {
            return;
        }

        const csvHeaders = [
            {id: 'directory', title: 'Directory'},
            {id: 'size', title: 'Size in MB'},
            {id: 'type', title: 'Type'},
        ];
        if (options.includeDatabaseCounts) {
            csvHeaders.push({
                id: 'databaseCount',
                title: 'Database count',
            });
        }

        if (options.csv) {
            const outputFile = 'discovered-indexeddb-' + timestampForFilename() + '.csv';
            const csvWriter = createObjectCsvWriter({
                path: outputFile,
                header: csvHeaders,
            });
            await csvWriter.writeRecords(roots);
            console.log('Wrote to ' + outputFile);
        } else if (options.stdout) {
            const csvWriter = createObjectCsvStringifier({
                header: csvHeaders,
            });
            console.log(csvWriter.getHeaderString()!.trim());
            console.log(csvWriter.stringifyRecords(roots).trim());
        }
    }

    if (options.csv || options.stdout) {
        printRoots(indexedDbRoots);
    } else if (options.return) {
        return indexedDbRoots;
    } else {
        throw new Error('Must use --stdout or --csv');
    }
}

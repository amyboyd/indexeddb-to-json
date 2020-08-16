#!/usr/bin/env node

const homedir = require('os').homedir();
const {createObjectCsvWriter, createObjectCsvStringifier} = require('csv-writer');
const {
    timestampForFilename,
    getFolderSizeInMb,
    globPromise,
    handleUncaughtExceptionsAndRejections,
} = require('./utils');

handleUncaughtExceptionsAndRejections();

const outputType = process.argv.length >= 3 && process.argv[2] === '--stdout' ? 'stdout' : 'csv';

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

async function findIndexedDbRootInPath(path) {
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

(async function () {
    const globs = searchPaths.map((searchPath) => {
        return globPromise(searchPath + '/**/*indexeddb*/', {
            realpath: true,
            nosort: true,
            nocase: true,
            dot: true,
            ignore: ignoreDirs,
        });
    });
    const potentialDirs = (await Promise.all(globs))
        .filter((dir) => dir.length > 0)
        .reduce((prev, current) => {
            return prev.concat(current);
        }, [])
        .unique();

    const indexedDbRoots = (await Promise.all(potentialDirs.map((dir) => findIndexedDbRootInPath(dir))))
        .filter((roots) => roots.length > 0)
        .reduce((prev, current) => {
            return prev.concat(current);
        }, [])
        .unique()
        .sort((a, b) => a.localeCompare(b));

    console.log('Found ' + indexedDbRoots.length + ' database(s)');

    async function printDbRoots(roots) {
        if (roots.length === 0) {
            return;
        }

        const csvHeaders = [
            {id: 'path', title: 'Path'},
            {id: 'size', title: 'Size in MB'},
        ];

        const csvRows = await Promise.all(
            roots.map(async (root) => {
                return {
                    path: root,
                    size: await getFolderSizeInMb(root),
                };
            }),
        );

        if (outputType === 'csv') {
            const outputFile = 'discovered-indexeddb-' + timestampForFilename() + '.csv';
            const csvWriter = createObjectCsvWriter({
                path: outputFile,
                header: csvHeaders,
            });
            await csvWriter.writeRecords(csvRows);
            console.log('Wrote to ' + outputFile);
        } else if (outputType === 'stdout') {
            const csvWriter = createObjectCsvStringifier({
                header: csvHeaders,
            });
            console.log(csvWriter.getHeaderString().trim());
            console.log(csvWriter.stringifyRecords(csvRows).trim());
        } else {
            throw new Error('Unsupported output type: ' + outputType);
        }
    }

    printDbRoots(indexedDbRoots);
})();

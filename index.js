#!/usr/bin/env node

/**
 * Usage: `indexeddb-to-json [directory] [-p]`
 * Or: `node index.js [directory] [-p]`
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const puppeteer = require('puppeteer');
const copy = require('recursive-copy');
const {
    timestampForFilename,
    handleUncaughtExceptionsAndRejections,
} = require('./utils');

handleUncaughtExceptionsAndRejections();

let source = process.argv[2];
if (!source) {
    throw new Error('No source directory given');
}

if (!fs.existsSync(source)) {
    throw new Error(`Source directory does not exist: ${source}`);
}

source = source.replace(/\/+$/, '');

if (!fs.existsSync(source + '/CURRENT')) {
    throw new Error(
        `Source directory does not contain IndexedDB file: ${source}/CURRENT`,
    );
}

const outputDir = 'indexeddb-to-json-output';

const HOST_IN_SOURCE_PATH_REGEX = /\/(https?_[a-z0-9\\.]+)_0\.indexeddb\.leveldb/;
const HOST_IN_LOG_REUSING_LINE = / Reusing (MANIFEST|old log) \/.+\/(https?_[a-z0-9\\.]+)_0\.indexeddb\.leveldb/;
let host;
let match1;
if ((match1 = source.match(HOST_IN_SOURCE_PATH_REGEX)) && match1[1]) {
    host = match1[1].replace('_', '://');
}
if (!host && fs.existsSync(source + '/LOG')) {
    const logLines = fs.readFileSync(source + '/LOG', 'utf8').split(/\n/g);
    let match2;
    for (let line of logLines) {
        if ((match2 = line.match(HOST_IN_LOG_REUSING_LINE)) && match2[2]) {
            host = match2[2].replace('_', '://');
            break;
        }
    }
}

if (!host) {
    throw new Error(`Host not figured out for ${source}`);
}

const chromeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-extract-'));

console.log('Extracting from:', source);
console.log('Host:', host);
console.log('Temporary Chrome directory:', chromeDir);

const printToStdout = process.argv[3] === '-p';
const verbose = process.argv[3] === '--verbose';

(async () => {
    try {
        const browser = await puppeteer.launch({
            executablePath:
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            headless: true,
            userDataDir: chromeDir,
            ignoreHTTPSErrors: true,
            args: [
                // See https://peter.sh/experiments/chromium-command-line-switches/
                '--allow-failed-policy-fetch-for-test',
                '--allow-insecure-localhost',
                '--allow-no-sandbox-job',
                '--allow-running-insecure-content',
                '--arc-disable-app-sync',
                '--arc-disable-locale-sync',
                '--disable-client-side-phishing-detection',
                '--disable-component-cloud-policy',
                '--disable-cookie-encryption',
                '--disable-default-apps',
                '--disable-explicit-dma-fences',
                '--disable-extensions-file-access-check',
                '--disable-extensions',
                '--disable-machine-cert-request',
                '--disable-site-isolation-trials',
                '--disable-sync',
                '--disable-web-security',
                '--enable-sandbox-logging',
                '--ignore-certificate-errors-spki-list',
                '--ignore-urlfetcher-cert-requests',
                '--managed-user-id=""',
                '--nacl-dangerous-no-sandbox-nonsfi',
                '--no-sandbox-and-elevated',
                '--run-without-sandbox-for-testing',
                '--single-process',
                '--unlimited-storage',
                '--unsafely-allow-protected-media-identifier-for-domain',
                '--unsafely-treat-insecure-origin-as-secure',
                '--webview-disable-safebrowsing-support',
                verbose ? '--enable-logging' : '',
                '--v=1',
            ],
        });

        const chromeIndexedDbDir =
            chromeDir +
            '/Default/IndexedDB/' +
            host.replace(/^(https?):\/\//, '$1_') +
            '_0.indexeddb.leveldb';
        await copy(source, chromeIndexedDbDir);
        console.log(`Copied IndexedDB to ${chromeIndexedDbDir}`);

        const lockfile = chromeIndexedDbDir + '/LOCK';
        if (fs.existsSync(lockfile)) {
            fs.unlinkSync(lockfile);
            console.log(`Deleted lockfile ${lockfile}`);
        }

        const sourceDatabasesDir = source
            .replace('IndexedDB', 'databases')
            .replace('.indexeddb.leveldb', '');
        if (fs.existsSync(sourceDatabasesDir)) {
            const chromeDatabasesDir = chromeIndexedDbDir
                .replace('IndexedDB', 'databases')
                .replace('.indexeddb.leveldb', '');
            await copy(sourceDatabasesDir, chromeDatabasesDir);
            console.log(
                "Copied host's IndexedDB folder to " + chromeDatabasesDir,
            );

            const sourceDatabasesDotDb = sourceDatabasesDir.replace(
                /\/http.+/,
                '/Databases.db',
            );
            const sourceDatabasesDotDbJournal =
                sourceDatabasesDotDb + '-journal';
            const chromeDatabasesDotDb =
                chromeDir + '/Default/databases/Databases.db';
            const chromeDatabasesDotDbJournal =
                chromeDatabasesDotDb + '-journal';

            if (fs.existsSync(sourceDatabasesDotDb)) {
                await copy(sourceDatabasesDotDb, chromeDatabasesDotDb);
                console.log(`Copied Databases.db to ${chromeDatabasesDotDb}`);
            }
            if (fs.existsSync(sourceDatabasesDotDbJournal)) {
                await copy(
                    sourceDatabasesDotDbJournal,
                    chromeDatabasesDotDbJournal,
                );
                console.log(
                    `Copied Databases.db-journal to ${chromeDatabasesDotDbJournal}`,
                );
            }
        }

        const page = await browser.newPage();

        await page.setCacheEnabled(false);
        await page.setOfflineMode(false);
        await page.setRequestInterception(true);

        page.on('request', (request) => {
            request.respond({
                status: 200,
                contentType: 'text/html',
                body: 'Fake page',
            });
        });

        if (verbose) {
            page.on('console', (msg) => {
                console.log('Console from inside Chrome:', msg._text);
            });
        }

        await page.goto(host);

        let result;
        try {
            result = await page.evaluate(async () => {
                /* global window */
                const databases = await window.indexedDB.databases();

                console.log(`Found ${databases.length} databases`);

                const dbPromises = databases.map((db) => {
                    console.log(`Database "${db.name}" version ${db.version}`);

                    return new Promise(function (resolveDb, rejectDb) {
                        const connection = window.indexedDB.open(db.name);
                        connection.onsuccess = async () => {
                            const objectStoreNames = Array.from(
                                connection.result.objectStoreNames,
                            );
                            const dbExportObject = {
                                database: db.name,
                                stores: {},
                            };

                            console.log(
                                `Database "${db.name}" version ${db.version} has object stores:`,
                                objectStoreNames,
                            );

                            const resolveStorePromises = objectStoreNames.map(
                                (storeName) => {
                                    return new Promise(function (
                                        resolveStore,
                                        rejectStore,
                                    ) {
                                        const transaction = connection.result.transaction(
                                            storeName,
                                            'readonly',
                                        );
                                        console.log(
                                            `Starting to read database "${db.name}" store "${storeName}"`,
                                        );

                                        transaction.onerror = (err) => {
                                            rejectStore(
                                                new Error(
                                                    `Transaction error for store ${storeName}: ${err}`,
                                                ),
                                            );
                                        };
                                        transaction.onabort = function (err) {
                                            rejectStore(
                                                new Error(
                                                    `Transaction aborted for store ${storeName}: ${err}`,
                                                ),
                                            );
                                        };
                                        const allStoreObjects = [];
                                        transaction
                                            .objectStore(storeName)
                                            .openCursor().onsuccess = (
                                            event,
                                        ) => {
                                            const cursor = event.target.result;
                                            if (cursor) {
                                                allStoreObjects.push(
                                                    cursor.value,
                                                );
                                                cursor.continue();
                                            } else {
                                                dbExportObject.stores[
                                                    storeName
                                                ] = allStoreObjects;
                                                resolveStore();
                                            }
                                        };
                                    });
                                },
                            );

                            try {
                                await Promise.all(resolveStorePromises);
                            } catch (e) {
                                rejectDb(
                                    new Error(
                                        `Error resolving object store: ${e}`,
                                    ),
                                );
                            }

                            resolveDb(dbExportObject);
                        };
                        connection.onerror = (error) => {
                            rejectDb(new Error(`Connection failed${error}`));
                        };
                        connection.onupgradeneeded = (error) => {
                            rejectDb(new Error(`Upgrade needed: ${error}`));
                        };
                        connection.onblocked = function (error) {
                            rejectDb(new Error(`Blocked: ${error}`));
                        };
                    });
                });

                try {
                    return Promise.all(dbPromises);
                } catch (e) {
                    throw new Error(e);
                }
            });
        } catch (e) {
            console.error(e);
            process.exit(1);
            return;
        }

        const databasesCount = result.length;
        const storesCount = result.reduce((prev, current) => {
            return prev + Object.keys(current.stores).length;
        }, 0);

        if (fs.existsSync(chromeDir + '/chrome_debug.log')) {
            const chromeDebugLog = fs.readFileSync(
                chromeDir + '/chrome_debug.log',
                'utf8',
            );
            console.error(`In chrome_debug.log:\n${chromeDebugLog}`);
        }

        await browser.close();

        fs.rmdirSync(chromeDir, {
            recursive: true,
            maxRetries: 5,
            retryDelay: 1000,
        });
        console.log(`Deleted temporary Chrome directory: ${chromeDir}`);

        console.log(
            `Extracted ${databasesCount} database(s) containing ${storesCount} store(s)`,
        );

        const json = JSON.stringify(result, ' ', 4);

        if (printToStdout) {
            console.log('Result:\n', json);
        } else {
            if (!fs.existsSync(outputDir + '/')) {
                fs.mkdirSync(outputDir + '/');
            }
            const timestamp = timestampForFilename();
            const outputFile =
                outputDir +
                '/' +
                host.replace('://', '_') +
                '-' +
                timestamp +
                '.json';
            fs.writeFileSync(outputFile, json);
            console.log('Wrote JSON to:', outputFile);
        }
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();

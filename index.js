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
const outputDir = 'indexeddb-to-json-output';

process.on('uncaughtException', function(e) {
    console.error('Uncaught exception', e);
});

let source = process.argv[2];
if (!source) {
    console.error('No source directory given');
    process.exit(1);
    return;
}

if (!fs.existsSync(source)) {
    console.error('Source directory does not exist:', source);
    process.exit(1);
    return;
}

source = source.replace(/\/+$/, '');

if (!source.endsWith('_0.indexeddb.leveldb')) {
    console.error('Source directory does not end with "_0.indexeddb.leveldb":', source);
    process.exit(1);
    return;
}

if (!fs.existsSync(source + '/CURRENT')) {
    console.error('Source directory does not contain IndexedDB file:', source + '/CURRENT');
    process.exit(1);
    return;
}

const sourceLastDir = source.substring(source.lastIndexOf('/') + 1);
const host = sourceLastDir.replace('_0.indexeddb.leveldb', '')
    .replace(/^http_/, 'http://')
    .replace(/^https_/, 'https://');

const chromeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-extract-'));

console.log('Extracting from:', source);
console.log('Host:', host);
console.log('Creating temporary Chrome directory:', chromeDir);

const printToStdout = process.argv[3] === '-p';

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            userDataDir: chromeDir,
            ignoreHTTPSErrors: true,
            args: [
                '--allow-failed-policy-fetch-for-test',
                '--allow-insecure-localhost',
                '--unlimited-storage',
                '--unsafely-treat-insecure-origin-as-secure',
                '--webview-disable-safebrowsing-support',
            ],
        });

        await copy(source, chromeDir + '/Default/IndexedDB/' + sourceLastDir);

        const page = await browser.newPage();

        await page.setCacheEnabled(false);
        await page.setOfflineMode(false);
        await page.setRequestInterception(true);
        page.on('request', request => {
            request.respond({
                status: 200,
                contentType: 'text/html',
                body: 'Fake page'
            });
        });

        await page.goto(host);

        const result = await page.evaluate(async () => {
            const databases = await window.indexedDB.databases();
            const dbPromises = databases.map((db) => {
                return new Promise(function (resolveDb, rejectDb) {
                    const connection = window.indexedDB.open(db.name);
                    connection.onsuccess = async (e) => {
                        const objectStoreNames = connection.result.objectStoreNames;
                        const dbExportObject = {database: db.name, stores: {}};

                        await Promise.all(Array.from(objectStoreNames).map((storeName) => {
                            return new Promise(function (resolveObjectStore, rejectObjectStore) {
                                const transaction = connection.result.transaction(storeName, 'readonly');

                                transaction.onerror = (err) => {
                                    rejectObjectStore(new Error('Transaction error: ' + err));
                                };

                                const allStoreObjects = [];
                                transaction.objectStore(storeName).openCursor().onsuccess = (event) => {
                                    const cursor = event.target.result;
                                    if (cursor) {
                                        allStoreObjects.push(cursor.value);
                                        cursor.continue();
                                    } else {
                                        dbExportObject.stores[storeName] = allStoreObjects;
                                        resolveObjectStore();
                                    }
                                };
                            });
                        }));

                        resolveDb(dbExportObject);
                    };
                    connection.onerror = e => {
                        rejectDb(new Error('Connection failed'));
                    };
                    connection.onupgradeneeded = e => {
                        rejectDb(new Error('Upgrade needed: ' + e));
                    };
                    connection.onblocked = function(e) {
                        rejectDb(new Error('Blocked: ' + e));
                    };
                });
            });

            return await Promise.all(dbPromises);
        });

        const databasesCount = result.length;
        const storesCount = result.reduce((prev, current) => {
            return prev + Object.keys(current.stores).length;
        }, 0);

        console.log(`Extracted ${databasesCount} database(s) containing ${storesCount} store(s)`);

        await browser.close();

        fs.rmdirSync(chromeDir, {recursive: true, maxRetries: 5, retryDelay: 1000});
        console.log('Deleted temporary Chrome directory:', chromeDir);

        const json = JSON.stringify(result, ' ', 4);

        if (printToStdout) {
            console.log('Result:\n', json);
        } else {
            if (!fs.existsSync(outputDir + '/')) {
                fs.mkdirSync(outputDir + '/');
            }
            const timestamp = (new Date())
                .toISOString()
                .replace(/[/:]/g, '-')
                .replace(/\.\d+Z$/, '')
                .replace('T', '-at-');
            const outputFile = outputDir + '/' + host.replace('://', '_') + '-' + timestamp + '.json';
            fs.writeFileSync(outputFile, json);
            console.log('Wrote JSON to:', outputFile);
        }
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();

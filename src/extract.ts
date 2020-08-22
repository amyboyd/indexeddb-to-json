import {existsSync} from 'fs';
import {promises as fsPromises} from 'fs';
import path from 'path';
import os from 'os';
import puppeteer, {ConsoleMessage} from 'puppeteer';
import copy from 'recursive-copy';
import {timestampForFilename} from './utils';
import {jsToEvaluateOnPage} from './extract-run-in-browser';

interface Database {
    database: string;
    stores: {
        [key: string]: {
            [key: string]: unknown;
        };
    };
}

interface CommandOptions {
    verbose: boolean;
    stdout: boolean;
}

export default async function extract(source: string, options: CommandOptions): Promise<void> {
    if (!existsSync(source)) {
        throw new Error(`Source directory does not exist: ${source}`);
    }

    source = source.replace(/\/+$/, '');

    if (!existsSync(source + '/CURRENT')) {
        throw new Error(`Source directory does not contain IndexedDB file: ${source}/CURRENT`);
    }

    const outputDir = 'indexeddb-to-json-output';

    const HOST_IN_SOURCE_PATH_REGEX = /\/(https?_[a-z0-9\\.]+)_0\.indexeddb\.leveldb/;
    const HOST_IN_LOG_REUSING_LINE = / Reusing (MANIFEST|old log) \/.+\/(https?_[a-z0-9\\.]+)_0\.indexeddb\.leveldb/;
    let host;
    let match1;
    if ((match1 = source.match(HOST_IN_SOURCE_PATH_REGEX)) && match1[1]) {
        host = match1[1].replace('_', '://');
    }
    if (!host && existsSync(source + '/LOG')) {
        const logLines = (await fsPromises.readFile(source + '/LOG', 'utf8')).split(/\n/g);
        let match2;
        for (const line of logLines) {
            if ((match2 = line.match(HOST_IN_LOG_REUSING_LINE)) && match2[2]) {
                host = match2[2].replace('_', '://');
                break;
            }
        }
    }

    if (!host) {
        throw new Error(`Host not figured out for ${source}`);
    }

    const chromeDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'puppeteer-extract-'));

    console.log('Extracting from:', source);
    console.log('Host:', host);
    console.log('Temporary Chrome directory:', chromeDir);

    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true,
        userDataDir: chromeDir,
        ignoreHTTPSErrors: true,
        args: [
            // See https://peter.sh/experiments/chromium-command-line-switches/
            // Yeah, this code is for real.
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
            '--v=1',
            options.verbose ? '--enable-logging' : '',
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
    if (existsSync(lockfile)) {
        await fsPromises.unlink(lockfile);
        console.log(`Deleted lockfile ${lockfile}`);
    }

    const sourceDatabasesDir = source
        .replace('IndexedDB', 'databases')
        .replace('.indexeddb.leveldb', '');
    if (existsSync(sourceDatabasesDir)) {
        const chromeDatabasesDir = chromeIndexedDbDir
            .replace('IndexedDB', 'databases')
            .replace('.indexeddb.leveldb', '');
        await copy(sourceDatabasesDir, chromeDatabasesDir);
        console.log("Copied host's IndexedDB folder to " + chromeDatabasesDir);

        const sourceDatabasesDotDb = sourceDatabasesDir.replace(/\/http.+/, '/Databases.db');
        const sourceDatabasesDotDbJournal = sourceDatabasesDotDb + '-journal';
        const chromeDatabasesDotDb = chromeDir + '/Default/databases/Databases.db';
        const chromeDatabasesDotDbJournal = chromeDatabasesDotDb + '-journal';

        if (existsSync(sourceDatabasesDotDb)) {
            await copy(sourceDatabasesDotDb, chromeDatabasesDotDb);
            console.log(`Copied Databases.db to ${chromeDatabasesDotDb}`);
        }
        if (existsSync(sourceDatabasesDotDbJournal)) {
            await copy(sourceDatabasesDotDbJournal, chromeDatabasesDotDbJournal);
            console.log(`Copied Databases.db-journal to ${chromeDatabasesDotDbJournal}`);
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

    if (options.verbose) {
        page.on('console', (msg: ConsoleMessage) => {
            console.log(`Console from inside Chrome: ${msg.text()}`);
        });
    }

    await page.goto(host);

    const result: Database[] = (await page.evaluate(jsToEvaluateOnPage)) as Database[];
    const databasesCount = result.length;
    const storesCount = result.reduce((prev, current) => {
        return prev + Object.keys(current.stores).length;
    }, 0);

    if (existsSync(chromeDir + '/chrome_debug.log')) {
        const chromeDebugLog = await fsPromises.readFile(chromeDir + '/chrome_debug.log', 'utf8');
        console.error(`In chrome_debug.log:\n${chromeDebugLog}`);
    }

    await browser.close();

    await fsPromises.rmdir(chromeDir, {
        recursive: true,
        maxRetries: 5,
        retryDelay: 1000,
    });
    console.log(`Deleted temporary Chrome directory: ${chromeDir}`);

    console.log(`Extracted ${databasesCount} database(s) containing ${storesCount} store(s)`);

    const json = JSON.stringify(result, null, '    ');

    if (options.stdout) {
        console.log('Result:\n', json);
    } else {
        if (!existsSync(outputDir + '/')) {
            await fsPromises.mkdir(outputDir + '/');
        }
        const timestamp = timestampForFilename();
        const outputFile = outputDir + '/' + host.replace('://', '_') + '-' + timestamp + '.json';
        await fsPromises.writeFile(outputFile, json);
        console.log(`Wrote JSON to ${outputFile}`);
    }
}

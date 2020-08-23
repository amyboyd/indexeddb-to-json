const jsToEvaluateOnPage = async () => {
    /* global window */

    const callbackForEachStore = async (db, connection, storeName) => {
        return new Promise(function (resolveStore, rejectStore) {
            const transaction = connection.result.transaction(storeName, 'readonly');
            console.log(`Starting to read database "${db.name}" store "${storeName}"`);

            transaction.onerror = (err) => {
                rejectStore(new Error(`Transaction error for store ${storeName}: ${err}`));
            };
            transaction.onabort = function (err) {
                rejectStore(new Error(`Transaction aborted for store ${storeName}: ${err}`));
            };

            const values = [];

            const onTransactionCursor = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    values.push(cursor.value);
                    cursor.continue();
                } else {
                    resolveStore(values);
                }
            };

            transaction.objectStore(storeName).openCursor().onsuccess = onTransactionCursor;
        });
    };

    const callbackForEachDb = async (db) => {
        console.log(`Database "${db.name}" version ${db.version}`);

        return new Promise(function (resolveDb, rejectDb) {
            const rejectFromError = (reason, error) => rejectDb(new Error(`${reason}: ${error}`));

            const connection = window.indexedDB.open(db.name);
            connection.onsuccess = async () => {
                const objectStoreNames = Array.from(connection.result.objectStoreNames);
                const dbExportObject = {
                    databaseName: db.name,
                    stores: [],
                };

                console.log(
                    `Database "${db.name}" version ${db.version} has object stores:`,
                    objectStoreNames,
                );

                const resolveStorePromises = objectStoreNames.map(async (storeName) => {
                    const values = await callbackForEachStore(db, connection, storeName);
                    dbExportObject.stores.push({
                        storeName: storeName,
                        values: values,
                    });
                });

                try {
                    await Promise.all(resolveStorePromises);
                } catch (e) {
                    rejectFromError('Error resolving object store', e);
                    return;
                }

                resolveDb(dbExportObject);
            };
            connection.onerror = (e) => rejectFromError('Connection failed', e);
            connection.onupgradeneeded = (e) => rejectFromError('Upgrade needed', e);
            connection.onblocked = (e) => rejectFromError('Blocked', e);
        });
    };

    const databases = await window.indexedDB.databases();
    console.log(`Found ${databases.length} databases`);

    const dbPromises = databases.map(callbackForEachDb);
    return Promise.all(dbPromises);
};

module.exports = {
    jsToEvaluateOnPage,
};

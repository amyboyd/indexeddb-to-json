export type IndexedDBType = 'Unknown' | 'Slack' | 'Teams';

export interface IndexedDBRoot {
    directory: string;
    size: number;
    type: IndexedDBType;
    databaseCount?: number | undefined;
    extractError?: string | undefined;
}

export interface Database {
    databaseName: string;
    stores?: Store[];
}

export interface Store {
    storeName: string;
    values: unknown[];
}

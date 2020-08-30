export type IndexedDBType = 'Unknown' | 'Slack' | 'Teams';

export interface IndexedDBRoot {
    directory: string;
    size: number;
    type: IndexedDBType;
}

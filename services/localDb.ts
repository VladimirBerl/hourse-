



const DB_NAME = 'ManegeProDB';
const DB_VERSION = 2;
const STORES = ['users', 'trainings', 'announcements', 'news', 'libraryPosts', 'developerMessages', 'conversations', 'chatMessages', 'settings', 'passwordResetRequests', 'skills', 'syncQueue', 'newLocationRequests', 'locations', 'welcomePageContent', 'bonusTransactions'];

let db: IDBDatabase;

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", (event.target as any).errorCode);
            reject("IndexedDB error");
        };

        request.onsuccess = (event) => {
            db = (event.target as any).result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as any).result;
            STORES.forEach(storeName => {
                if (!dbInstance.objectStoreNames.contains(storeName)) {
                    const keyPath = storeName !== 'syncQueue' ? { keyPath: 'id' } : { autoIncrement: true };
                    dbInstance.createObjectStore(storeName, keyPath);
                }
            });
        };
    });
};

export const saveData = <T extends { id: any }>(storeName: string, data: T[]): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            store.clear();
            data.forEach(item => store.put(item));

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject((event.target as any).error);
        } catch (error) {
            reject(error);
        }
    });
};

export const getData = <T>(storeName: string): Promise<T[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            if (!db.objectStoreNames.contains(storeName)) {
                return resolve([]);
            }
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject((event.target as any).error);
        } catch (error) {
            reject(error);
        }
    });
};

// Sync Queue Functions
export const addToSyncQueue = (item: any): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction('syncQueue', 'readwrite');
            const store = transaction.objectStore('syncQueue');
            store.add(item);
            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject((e.target as any).error);
        } catch (error) {
            reject(error);
        }
    });
};

export const getSyncQueue = (): Promise<any[]> => {
    return getData('syncQueue');
};

export const deleteFromSyncQueue = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction('syncQueue', 'readwrite');
            const store = transaction.objectStore('syncQueue');
            store.delete(id);
            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject((e.target as any).error);
        } catch (error) {
            reject(error);
        }
    });
};
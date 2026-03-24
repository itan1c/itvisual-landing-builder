const dbCache = {
    db: null,
    async init() {
        if (this.db) return;
        return new Promise((res, rej) => {
            const req = indexedDB.open('ITVisualData', 1);
            req.onupgradeneeded = e => e.target.result.createObjectStore('projectsFiles');
            req.onsuccess = e => { this.db = e.target.result; res(); };
            req.onerror = rej;
        });
    },
    async set(id, val) {
        await this.init();
        return new Promise((res, rej) => {
            const tx = this.db.transaction('projectsFiles', 'readwrite');
            tx.objectStore('projectsFiles').put(val, id);
            tx.oncomplete = res;
            tx.onerror = rej;
        });
    },
    async get(id) {
        await this.init();
        return new Promise((res, rej) => {
            const req = this.db.transaction('projectsFiles').objectStore('projectsFiles').get(id);
            req.onsuccess = e => res(e.target.result);
            req.onerror = rej;
        });
    }
};
window.dbCache = dbCache;

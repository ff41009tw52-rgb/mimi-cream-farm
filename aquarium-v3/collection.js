const database = 'class-aquarium-v3';
const store = 'fish';
const notice = database + ':change';
const maxFish = 80;

export function createCollection() {
  let connection;
  let channel;
  try { channel = new BroadcastChannel(notice); } catch {}
  const listeners = new Set();
  function change() {
    for (const callback of listeners) callback();
  }
  if (channel) channel.onmessage = change;
  addEventListener('storage', event => { if (event.key===notice) change(); });

  function db() {
    if (connection) return connection;
    connection = new Promise((resolve,reject) => {
      const open = indexedDB.open(database,1);
      open.onupgradeneeded = () => open.result.createObjectStore(store,{keyPath:'id'});
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        open.result.onversionchange = () => { open.result.close(); connection = undefined; };
        resolve(open.result);
      };
    }).catch(error => { connection = undefined; throw error; });
    return connection;
  }

  async function transaction(mode, perform) {
    const database = await db();
    return new Promise((resolve,reject) => {
      const tx = database.transaction(store,mode);
      let result, failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || new Error('儲存作業已中止'));
      tx.onerror = () => { failure ||= tx.error; };
      perform(tx.objectStore(store), value => { result=value; }, error => {
        failure=error;
        tx.abort();
      });
    });
  }

  async function write(perform) {
    const result = await transaction('readwrite',perform);
    if (channel) channel.postMessage('changed');
    else {
      try { localStorage.setItem(notice,crypto.randomUUID()); } catch {}
    }
    change();
    return result;
  }

  return {
    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    list() {
      return transaction('readonly',(table,result) => {
        const req = table.getAll();
        req.onsuccess = () => result(req.result.sort((a,b) => a.createdAt-b.createdAt || a.id.localeCompare(b.id)));
      });
    },
    add(blob,type,artworkRevision) {
      const record = {id:crypto.randomUUID(),blob,type,createdAt:Date.now(),artworkRevision};
      return write((table,result,abort) => {
        const count = table.count();
        count.onsuccess = () => {
          if (count.result >= maxFish) abort(new Error('水族館已達 80 份作品，請先到展示端刪除部分作品。'));
          else {
            table.add(record);
            result(record);
          }
        };
      });
    },
    remove(id) { return write(table => table.delete(id)); },
    clear() { return write(table => table.clear()); },
  };
}

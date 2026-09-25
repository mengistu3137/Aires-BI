import {
  createObservationRequest,
  updateObservationRequest,
} from "@/services/api/observations.api.js";
import { generateClientObservationId } from "../utils/observation.utils.js";

const DB_NAME = "aires-bi-observations";
const DB_VERSION = 1;
const STORE_NAME = "queue";

let dbPromise = null;

const openDB = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported on this device"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "syncStatus", { unique: false });
        store.createIndex("auditId", "auditId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
};

/**
 * True while the browser reports a network connection. Checked live at the
 * moment of each sync attempt (rather than trusting a React state value)
 * so we never fire off a doomed request that will time out and then flip
 * the UI back a moment later.
 */
export const isNetworkOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine);

/**
 * Notify any listeners (e.g. React Query invalidation, useLocalQueue) that
 * an observation changed sync state. Uses a DOM CustomEvent to avoid
 * coupling the queue to React Query.
 */
const emitObservationsChanged = (detail) => {
  try {
    window.dispatchEvent(new CustomEvent("aires:observations-changed", { detail }));
  } catch {
    // Non-critical — silently ignore if window is unavailable
  }
};

/**
 * Explicitly notify queue listeners for a given audit.
 * Called after enqueue and removal so the UI can refresh immediately.
 */
export const notifyQueueChanged = (auditId) => {
  emitObservationsChanged({ auditId, source: "queue" });
};

/**
 * Convert a raw queued record (IndexedDB) into the same shape the server
 * returns from the observation endpoints, so the UI can render both
 * side-by-side and dedupe by clientObservationId.
 */
export const formatQueuedObservation = (record) => {
  if (!record) return null;
  return {
    id: record.serverObservationId || record.id,
    clientObservationId: record.id,
    auditId: record.auditId,
    productId: record.productId,
    availability: record.availability,
    price: record.price,
    observedUnit: record.observedUnit || null,
    packageSize: record.packageSize || null,
    capturedAt: record.capturedAt,
    evidencePhotoUrl: record.evidencePhotoUrl || null,
    notes: record.notes || null,
    sync: {
      status: record.syncStatus || "PENDING",
      attempts: record.syncAttempts || 0,
      lastSyncAttemptAt: record.lastSyncAttemptAt || null,
      syncedAt: null,
      error: record.syncError || null,
    },
    review: {
      status: "PENDING",
      reviewedAt: null,
      reviewNote: null,
      reviewedBy: null,
    },
    product: undefined,
    __local: true,
  };
};

/**
 * Queue an observation for sync. `observation.operation` is "CREATE"
 * (default) for a brand-new observation, or "UPDATE" with
 * `serverObservationId` set when this is an offline edit to a row that
 * already exists on the server.
 *
 * Re-enqueuing the same clientObservationId (e.g. the user edits the same
 * product again before the first save has synced) merges into the same
 * queued record instead of creating a duplicate, and resets it to PENDING
 * so it's picked up on the next flush.
 */
export const enqueueObservation = async (observation) => {
  const db = await openDB();
  const id = observation.clientObservationId || generateClientObservationId();

  const existing = await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });

  const record = {
    ...existing,
    ...observation,
    id,
    operation: observation.operation || existing?.operation || "CREATE",
    serverObservationId: observation.serverObservationId ?? existing?.serverObservationId ?? null,
    syncStatus: "PENDING",
    syncAttempts: existing?.syncAttempts || 0,
    lastSyncAttemptAt: existing?.lastSyncAttemptAt || null,
    syncError: null,
    createdAt: existing?.createdAt || observation.createdAt || new Date().toISOString(),
  };

  const saved = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });

  // Notify the UI to re-read the local queue so the row appears immediately.
  notifyQueueChanged(record.auditId);

  return saved;
};

export const getPendingObservations = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("status");
    const request = index.getAll("PENDING");
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const getObservationsForAudit = async (auditId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("auditId");
    const request = index.getAll(auditId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Look up one queued record by its clientObservationId (or, once synced,
 * its serverObservationId). Used by the detail page to recognize "this
 * isn't missing, it just hasn't synced yet" instead of showing a plain
 * not-found error when opened offline.
 */
export const getQueuedObservationById = async (id) => {
  if (!id) return null;
  const db = await openDB();
  const byId = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  if (byId) return byId;

  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  return all.find((r) => r.serverObservationId === id) || null;
};

export const updateQueuedObservation = async (id, updates) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (!existing) {
        reject(new Error(`Observation ${id} not found in queue`));
        return;
      }
      const updated = { ...existing, ...updates };
      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve(updated);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

export const removeQueuedObservation = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const countPendingObservations = async () => {
  const pending = await getPendingObservations();
  return pending.length;
};

/**
 * Attempt to push one queued observation to the server.
 *
 * Critically, this checks connectivity FIRST. If the device is offline we
 * bail out immediately without touching the network — this is what used
 * to cause the "status changes then reverts" behavior: the code would
 * always fire the request, wait for it to fail (sometimes after a long
 * timeout), flip the row to SYNCING, then flip it back to PENDING. Now,
 * while offline, the row simply stays PENDING the whole time and nothing
 * is attempted until flushQueue() runs after reconnecting.
 */
export const syncObservation = async (observation) => {
  if (!isNetworkOnline()) {
    return { success: false, permanent: false, offline: true };
  }

  try {
    await updateQueuedObservation(observation.id, {
      syncStatus: "SYNCING",
      lastSyncAttemptAt: new Date().toISOString(),
      syncAttempts: (observation.syncAttempts || 0) + 1,
    });
    emitObservationsChanged({
      auditId: observation.auditId,
      observationId: observation.id,
      status: "SYNCING",
    });

    const payload = {
      clientObservationId: observation.id,
      productId: observation.productId,
      availability: observation.availability,
      price: observation.price,
      observedUnit: observation.observedUnit || null,
      packageSize: observation.packageSize || null,
      capturedAt: observation.capturedAt,
      evidencePhotoUrl: observation.evidencePhotoUrl || null,
      notes: observation.notes || null,
    };

    const response =
      observation.operation === "UPDATE" && observation.serverObservationId
        ? await updateObservationRequest({
            observationId: observation.serverObservationId,
            payload: { price: payload.price, availability: payload.availability },
          })
        : await createObservationRequest({ auditId: observation.auditId, payload });

    // Remove from IndexedDB FIRST, then notify. This guarantees any
    // refresh triggered by the notification sees an empty queue for
    // this observation.
    await removeQueuedObservation(observation.id);

    emitObservationsChanged({
      auditId: observation.auditId,
      observationId: response?.data?.id,
      status: "SYNCED",
    });

    // Return the formatted observation so the page can write it to cache
    return { success: true, data: response?.data };
  } catch (error) {
    const status = error?.response?.status;
    const isPermanent = status && status >= 400 && status < 500 && status !== 408 && status !== 429;

    await updateQueuedObservation(observation.id, {
      syncStatus: isPermanent ? "FAILED" : "PENDING",
      syncError: error?.response?.data?.message || error.message,
    });

    emitObservationsChanged({
      auditId: observation.auditId,
      observationId: observation.id,
      status: isPermanent ? "FAILED" : "PENDING",
    });

    return { success: false, permanent: isPermanent, error };
  }
};

/**
 * Push every PENDING queued observation to the server. This is the piece
 * that was missing before: nothing ever called it, so items saved while
 * offline just sat in IndexedDB forever unless the user happened to save
 * a brand-new observation later (which only synced that one item). Call
 * this whenever connectivity returns.
 */
export const flushQueue = async () => {
  if (!isNetworkOnline()) {
    const pending = await countPendingObservations();
    return { synced: 0, failed: 0, pending, skipped: true };
  }

  const pending = await getPendingObservations();
  let synced = 0;
  let failed = 0;
  for (const obs of pending) {
    const result = await syncObservation(obs);
    if (result.success) synced += 1;
    else if (result.permanent) failed += 1;
  }
  const remaining = await countPendingObservations();
  return { synced, failed, pending: remaining };
};

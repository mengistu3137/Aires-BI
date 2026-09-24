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
 * Notify any listeners (e.g. React Query invalidation) that an
 * observation changed sync state. Uses a DOM CustomEvent to avoid
 * coupling the queue to React Query.
 */
const emitObservationsChanged = (detail) => {
  try {
    window.dispatchEvent(new CustomEvent("aires:observations-changed", { detail }));
  } catch {
    // Non-critical — silently ignore if window is unavailable
  }
};

export const enqueueObservation = async (observation) => {
  const db = await openDB();
  const record = {
    id: observation.clientObservationId || generateClientObservationId(),
    ...observation,
    syncStatus: "PENDING",
    syncAttempts: 0,
    lastSyncAttemptAt: null,
    syncError: null,
    createdAt: observation.createdAt || new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
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

export const syncObservation = async (observation) => {
  try {
    await updateQueuedObservation(observation.id, {
      syncStatus: "SYNCING",
      lastSyncAttemptAt: new Date().toISOString(),
      syncAttempts: (observation.syncAttempts || 0) + 1,
    });

    const response = await createObservationRequest({
      auditId: observation.auditId,
      payload: {
        clientObservationId: observation.id,
        productId: observation.productId,
        availability: observation.availability,
        price: observation.price,
        observedUnit: observation.observedUnit || null,
        packageSize: observation.packageSize || null,
        capturedAt: observation.capturedAt,
        evidencePhotoUrl: observation.evidencePhotoUrl || null,
        notes: observation.notes || null,
      },
    });

    await removeQueuedObservation(observation.id);

    // Notify UI subscribers so React Query can invalidate relevant keys.
    emitObservationsChanged({
      auditId: observation.auditId,
      observationId: response?.data?.id,
      status: "SYNCED",
    });

    return { success: true, data: response.data };
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

export const flushQueue = async () => {
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

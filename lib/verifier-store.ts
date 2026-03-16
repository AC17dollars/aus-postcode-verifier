"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type StoragePreference,
  STORAGE_PREF_ATTR,
  normalizeStoragePreference,
} from "./storage-pref";

export type { StoragePreference } from "./storage-pref";

export interface PersistedLocality {
  id: number;
  location: string;
  postcode: string;
  state: string;
  latitude: number;
  longitude: number;
  category: string;
}

export type AddressVerifierStatus = "idle" | "loading" | "success" | "error";

export interface VerifierFormValues {
  postcode: string;
  suburb: string;
  state: string;
}

interface VerifierState {
  form: VerifierFormValues;
  matchingLocalities: PersistedLocality[];
  otherLocalities: PersistedLocality[];
  status: AddressVerifierStatus;
  message: string;
  showMapOnMobile: boolean;
}

interface VerifierActions {
  setForm: (form: Partial<VerifierFormValues>) => void;
  setLocalities: (
    matching: PersistedLocality[],
    others: PersistedLocality[],
  ) => void;
  setStatus: (status: AddressVerifierStatus, message?: string) => void;
  setShowMapOnMobile: (show: boolean) => void;
  reset: () => void;
}

const defaultForm: VerifierFormValues = {
  postcode: "",
  suburb: "",
  state: "",
};

const initialState: VerifierState = {
  form: defaultForm,
  matchingLocalities: [],
  otherLocalities: [],
  status: "idle",
  message: "",
  showMapOnMobile: false,
};

function getInitialStoragePreference(): StoragePreference {
  if (globalThis.document === undefined) return "sessionStorage";
  const el = globalThis.document.querySelector(`[${STORAGE_PREF_ATTR}]`);
  const value = el?.getAttribute(STORAGE_PREF_ATTR);
  return normalizeStoragePreference(value);
}

const storagePreferenceRef: { current: StoragePreference } = {
  current: getInitialStoragePreference(),
};

export const PERSIST_KEY = "verifier-state";

export function setStoragePreferenceForPersistence(pref: StoragePreference) {
  storagePreferenceRef.current = pref;
}

/**
 * Migrate persisted state when switching storage preference. Call after server save succeeds.
 * - If switching to "none": removes key from both sessionStorage and localStorage (state stays in memory).
 * - If switching between session/local: copies data from old storage to new, then removes from old.
 */
export function migratePersistedState(
  from: StoragePreference,
  to: StoragePreference,
): void {
  if (globalThis.window === undefined) return;
  const key = PERSIST_KEY;

  if (to === "none") {
    globalThis.window.sessionStorage?.removeItem(key);
    globalThis.window.localStorage?.removeItem(key);
    return;
  }

  let data: string | null = null;
  if (from !== "none") {
    const fromStorage = getStorageForPreference(from);
    if (fromStorage) {
      data = fromStorage.getItem(key);
      fromStorage.removeItem(key);
    }
  }

  const toStorage = getStorageForPreference(to);
  if (toStorage && data !== null) {
    toStorage.setItem(key, data);
  }
}

interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorageForPreference(pref: StoragePreference): WebStorage | null {
  if (pref === "none") return null;
  if (globalThis.window === undefined) return null;
  return pref === "localStorage"
    ? globalThis.window.localStorage
    : globalThis.window.sessionStorage;
}

type PersistedSlice = Pick<
  VerifierState,
  | "form"
  | "matchingLocalities"
  | "otherLocalities"
  | "status"
  | "message"
  | "showMapOnMobile"
>;

function makePersistStorage() {
  return {
    getItem: (name: string): PersistedSlice | null => {
      const pref = storagePreferenceRef.current;
      const storage = getStorageForPreference(pref);
      if (!storage) return null;
      const raw = storage.getItem(name);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as PersistedSlice;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: PersistedSlice): void => {
      const pref = storagePreferenceRef.current;
      const storage = getStorageForPreference(pref);
      if (storage) storage.setItem(name, JSON.stringify(value));
    },
    removeItem: (name: string): void => {
      const pref = storagePreferenceRef.current;
      const storage = getStorageForPreference(pref);
      if (storage) storage.removeItem(name);
    },
  };
}

const customStorage = makePersistStorage();

type FullState = VerifierState & VerifierActions;

export const useVerifierStore = create<FullState>()(
  persist(
    (set) => ({
      ...initialState,
      setForm: (form) =>
        set((s) => ({
          form: { ...s.form, ...form },
        })),
      setLocalities: (matching, others) =>
        set({ matchingLocalities: matching, otherLocalities: others }),
      setStatus: (status, message = "") => set({ status, message }),
      setShowMapOnMobile: (showMapOnMobile) => set({ showMapOnMobile }),
      reset: () => set(initialState),
    }),
    {
      name: PERSIST_KEY,
      storage: {
        getItem: (name) =>
          customStorage.getItem(name) as ReturnType<
            import("zustand/middleware").PersistStorage<FullState>["getItem"]
          >,
        setItem: (name, value) =>
          customStorage.setItem(name, value as unknown as PersistedSlice),
        removeItem: (name) => customStorage.removeItem(name),
      },
      partialize: (state) =>
        ({
          form: state.form,
          matchingLocalities: state.matchingLocalities,
          otherLocalities: state.otherLocalities,
          status: state.status,
          message: state.message,
          showMapOnMobile: state.showMapOnMobile,
        }) as FullState,
    },
  ),
);

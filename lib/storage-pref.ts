export type StoragePreference = "none" | "sessionStorage" | "localStorage";

/** Data attribute the server sets on the root so the store can read preference before rehydration. */
export const STORAGE_PREF_ATTR = "data-verifier-storage-pref";

export function normalizeStoragePreference(value: unknown): StoragePreference {
  if (
    value === "none" ||
    value === "sessionStorage" ||
    value === "localStorage"
  ) {
    return value;
  }
  return "sessionStorage";
}

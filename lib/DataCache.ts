/**
 * ZAKUPSY - Global Performance Cache
 * Trzyma dane w pamięci RAM przeglądarki, aby nawigacja była natychmiastowa.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class GlobalDataCache {
  private cache: Record<string, CacheEntry<any>> = {};
  private TTL = 1000 * 60 * 5; // Dane są ważne przez 5 minut

  set<T>(key: string, data: T) {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
    };
  }

  get<T>(key: string): T | null {
    const entry = this.cache[key];
    if (!entry) return null;

    // Sprawdź czy dane nie są za stare
    if (Date.now() - entry.timestamp > this.TTL) {
      delete this.cache[key];
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string) {
    delete this.cache[key];
  }
}

// Eksportujemy pojedynczą instancję (Singleton)
export const dataCache = new GlobalDataCache();

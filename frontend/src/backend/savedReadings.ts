const LOCAL_STORAGE_KEY = 'savedReadings';

export function getSavedReadings(): string[] { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]'); }

export function saveReadings(readings: string[]) { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(readings)); }

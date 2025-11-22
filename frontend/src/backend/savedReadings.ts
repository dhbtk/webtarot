const SAVED_READINGS_KEY = 'savedReadings'
const HISTORY_KEY = 'history'

export function getSavedReadings (): string[] { return JSON.parse(localStorage.getItem(SAVED_READINGS_KEY) || '[]') }

export function saveReadings (readings: string[]) { localStorage.setItem(SAVED_READINGS_KEY, JSON.stringify(readings)) }

export function addReading (reading: string) { saveReadings([reading, ...getSavedReadings()]) }

export function removeReading (reading: string) { saveReadings(getSavedReadings().filter(r => r !== reading)) }

export function getHistory (): string[] { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') }

export function addToHistory (reading: string) { localStorage.setItem(HISTORY_KEY, JSON.stringify([reading, ...getHistory()])) }

export function deleteFromHistory (reading: string) { localStorage.setItem(HISTORY_KEY, JSON.stringify(getHistory().filter(r => r !== reading))) }

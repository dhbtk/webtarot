// Auto-generated TypeScript interfaces to mirror Rust structs and shared models.
// Source Rust types:
// - backend/src/reading.rs: CreateReadingRequest, CreateReadingResponse
// - backend/src/interpretation.rs: CreateInterpretationRequest, CreateInterpretationResponse, GetInterpretationResult
// - shared/src/model.rs: Card, Arcana, MajorArcana, Rank, Suit

// Enums serialized with serde(rename_all = "camelCase") are represented as lowercase-camelCase string unions here.

export const MajorArcanaValues = [
  'fool',
  'magician',
  'highPriestess',
  'empress',
  'emperor',
  'hierophant',
  'lovers',
  'chariot',
  'strength',
  'hermit',
  'wheelOfFortune',
  'justice',
  'hangedMan',
  'death',
  'temperance',
  'devil',
  'tower',
  'star',
  'moon',
  'sun',
  'judgement',
  'world',
] as const
export type MajorArcana = typeof MajorArcanaValues[number];

export const RankValues = [
  'ace',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'page',
  'knight',
  'queen',
  'king',
] as const
export type Rank = typeof RankValues[number];

export const SuitValues = ['cups', 'pentacles', 'swords', 'wands'] as const
export type Suit = typeof SuitValues[number];

// Arcana is an externally-tagged enum serialized by Serde with camelCase variant names.
// Example JSON shapes:
//   { "major": { "name": "fool" } }
//   { "minor": { "rank": "ace", "suit": "cups" } }
export type Arcana =
  | { major: { name: MajorArcana } }
  | { minor: { rank: Rank; suit: Suit } };

export const getAllArcana = (): Arcana[] => {
  const list = []
  for (const name of MajorArcanaValues) {
    list.push({ major: { name } })
  }
  for (const suit of SuitValues) {
    for (const rank of RankValues) {
      list.push({ minor: { rank, suit } })
    }
  }
  return list
}

export interface Card {
  arcana: Arcana;
  flipped: boolean;
}

// Mirrors Rust: Reading { id: Uuid, created_at: DateTime<Utc>, question: String, shuffled_times: usize, cards: Vec<Card> }
// Note: backend uses serde(rename_all = "camelCase"), so fields are camelCase in JSON.
export interface Reading {
  id: string; // UUID string
  createdAt: string; // ISO 8601 timestamp
  question: string;
  shuffledTimes: number;
  cards: Card[];
  userId: string;
}

// Mirrors Rust: CreateReadingRequest { question: String, cards: u8 }
export interface CreateReadingRequest {
  question: string;
  cards: number; // u8 in Rust → number in TS
}

// Mirrors Rust: CreateReadingResponse { shuffledTimes: usize, cards: Vec<Card>, interpretationId: String }
export interface CreateReadingResponse {
  shuffledTimes: number;
  cards: Card[];
  interpretationId: string; // UUID string
}

// Mirrors Rust: GetInterpretationResult { done: bool, error: String, interpretation: String, reading: Option<Reading> }
export interface GetInterpretationResult {
  done: boolean;
  error: string;
  interpretation: string;
  reading: Reading | null;
}

// Mirrors Rust: CreateInterpretationRequest { question: String, cards: Vec<Card> }
export interface CreateInterpretationRequest {
  question: string;
  cards: Card[];
}

// Mirrors Rust: CreateInterpretationResponse { interpretationId: Uuid }
export interface CreateInterpretationResponse {
  interpretationId: string;
}

// Mirrors Rust: stats::ArcanaStats with serde(rename_all = "camelCase")
export interface ArcanaStats {
  arcana: Arcana;
  drawnFlippedCount: number;
  drawnCount: number;
  totalCount: number;
  percentFlipped: number;
  percentDrawn: number;
  percentTotal: number;
}

// Mirrors Rust: stats::Stats with serde(rename_all = "camelCase")
export interface Stats {
  totalReadings: number;
  totalCardsDrawn: number;
  arcanaStats: ArcanaStats[];
  neverDrawn: Arcana[];
}

// Mirrors Rust enum Interpretation in backend/src/interpretation.rs
// Serde externally-tagged enum with tuple variants serializes as:
// - { "Pending": { ...Reading } }
// - { "Done": [ { ...Reading }, "<text>" ] }
// - { "Failed": [ { ...Reading }, "<error>" ] }
export type Interpretation =
  | { Pending: Reading }
  | { Done: [Reading, string] }
  | { Failed: [Reading, string] };

export function interpretationReading (i: Interpretation): Reading {
  if ((i as any).Pending) return (i as { Pending: Reading }).Pending
  if ((i as any).Done) return (i as { Done: [Reading, string] }).Done[0]
  if ((i as any).Failed) return (i as { Failed: [Reading, string] }).Failed[0]
  // Fallback to a narrow type error; this should never happen at runtime
  throw new Error('Unknown Interpretation variant')
}

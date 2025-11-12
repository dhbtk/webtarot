// Auto-generated TypeScript interfaces to mirror Rust structs and shared models.
// Source Rust types:
// - backend/src/reading.rs: CreateReadingRequest, CreateReadingResponse
// - backend/src/interpretation.rs: GetInterpretationResult
// - shared/src/model.rs: Card, Arcana, MajorArcana, Rank, Suit

// Enums serialized with serde(rename_all = "camelCase") are represented as lowercase-camelCase string unions here.

export type MajorArcana =
  | 'fool'
  | 'magician'
  | 'highPriestess'
  | 'empress'
  | 'emperor'
  | 'hierophant'
  | 'lovers'
  | 'chariot'
  | 'strength'
  | 'hermit'
  | 'wheelOfFortune'
  | 'justice'
  | 'hangedMan'
  | 'death'
  | 'temperance'
  | 'devil'
  | 'tower'
  | 'star'
  | 'moon'
  | 'sun'
  | 'judgement'
  | 'world';

export type Rank =
  | 'ace'
  | 'two'
  | 'three'
  | 'four'
  | 'five'
  | 'six'
  | 'seven'
  | 'eight'
  | 'nine'
  | 'ten'
  | 'page'
  | 'knight'
  | 'queen'
  | 'king';

export type Suit = 'cups' | 'pentacles' | 'swords' | 'wands';

// Arcana is an externally-tagged enum serialized by Serde with camelCase variant names.
// Example JSON shapes:
//   { "major": { "name": "fool" } }
//   { "minor": { "rank": "ace", "suit": "cups" } }
export type Arcana =
  | { major: { name: MajorArcana } }
  | { minor: { rank: Rank; suit: Suit } };

export interface Card {
  arcana: Arcana;
  flipped: boolean;
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

// Mirrors Rust: GetInterpretationResult { done: bool, error: String, interpretation: String }
export interface GetInterpretationResult {
  done: boolean;
  error: string;
  interpretation: string;
}

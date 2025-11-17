import type { Arcana, Card, MajorArcana, Rank, Suit } from '../backend/models.ts'

// Type guards for the Arcana union
function isMajor(arcana: Arcana): arcana is { major: { name: MajorArcana } } {
  return (arcana as any).major !== undefined
}

function isMinor(arcana: Arcana): arcana is { minor: { rank: Rank; suit: Suit } } {
  return (arcana as any).minor !== undefined
}

const majorLabels: Record<MajorArcana, string> = {
  fool: 'O Louco',
  magician: 'O Mago',
  highPriestess: 'A Suma Sacerdotisa',
  empress: 'A Imperatriz',
  emperor: 'O Imperador',
  hierophant: 'O Hierofante',
  lovers: 'Os Enamorados',
  chariot: 'O Carro',
  strength: 'A Força',
  hermit: 'O Eremita',
  wheelOfFortune: 'A Roda da Fortuna',
  justice: 'A Justiça',
  hangedMan: 'O Enforcado',
  death: 'A Morte',
  temperance: 'A Temperança',
  devil: 'O Diabo',
  tower: 'A Torre',
  star: 'A Estrela',
  moon: 'A Lua',
  sun: 'O Sol',
  judgement: 'O Julgamento',
  world: 'O Mundo',
}

const rankLabels: Record<Rank, string> = {
  ace: 'Ás',
  two: 'Dois',
  three: 'Três',
  four: 'Quatro',
  five: 'Cinco',
  six: 'Seis',
  seven: 'Sete',
  eight: 'Oito',
  nine: 'Nove',
  ten: 'Dez',
  page: 'Valete',
  knight: 'Cavaleiro',
  queen: 'Rainha',
  king: 'Rei',
}

const suitLabels: Record<Suit, string> = {
  cups: 'Copas',
  pentacles: 'Ouros',
  swords: 'Espadas',
  wands: 'Paus',
}

export function arcanaLabel(arcana: Arcana): string {
  if (isMajor(arcana)) {
    return majorLabels[arcana.major.name]
  }
  if (isMinor(arcana)) {
    const { rank, suit } = arcana.minor
    return `${rankLabels[rank]} de ${suitLabels[suit]}`
  }
  // Fallback (should not happen with current typings)
  return ''
}

export function cardLabel(card: Card): string {
  const base = arcanaLabel(card.arcana)
  return card.flipped ? `${base} (invertido)` : base
}

// --- Images mapping ---
// Eagerly import all card images so Vite returns URL strings for each.
// We only rely on filenames to match Arcana to the proper image.
// Supported patterns observed in assets:
// - Major Arcana: "NN-Name.jpg" (e.g., "08-Strength.jpg", "17-TheStar.jpg")
// - Minor Arcana: "SuitNN.jpg" (e.g., "Cups01.jpg", "Wands14.jpg")
const imageModules = import.meta.glob('../assets/cardimages/*.{jpg,JPG,png,svg}', {
  eager: true,
  as: 'url',
}) as Record<string, string>

// Build quick lookup maps from the imported modules
const majorByIndex: Record<number, string> = {}
const minorByKey: Record<string, string> = {}

for (const [path, url] of Object.entries(imageModules)) {
  const file = path.split('/').pop() || ''
  // Major: NN-...
  let m = file.match(/^(\d{2})-/)
  if (m) {
    const idx = parseInt(m[1], 10)
    majorByIndex[idx] = url
    continue
  }
  // Minor: SuitNN.jpg
  m = file.match(/^(Cups|Pentacles|Swords|Wands)(\d{2})\./i)
  if (m) {
    const suitName = `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}`
    const key = `${suitName}${m[2]}`
    minorByKey[key] = url
  }
}

// Map MajorArcana names (camelCase strings) to their index order (00..21),
// matching the enum order in shared/src/model.rs
const majorIndexMap: Record<MajorArcana, number> = {
  fool: 0,
  magician: 1,
  highPriestess: 2,
  empress: 3,
  emperor: 4,
  hierophant: 5,
  lovers: 6,
  chariot: 7,
  strength: 8,
  hermit: 9,
  wheelOfFortune: 10,
  justice: 11,
  hangedMan: 12,
  death: 13,
  temperance: 14,
  devil: 15,
  tower: 16,
  star: 17,
  moon: 18,
  sun: 19,
  judgement: 20,
  world: 21,
}

const suitNameMap: Record<Suit, 'Cups' | 'Pentacles' | 'Swords' | 'Wands'> = {
  cups: 'Cups',
  pentacles: 'Pentacles',
  swords: 'Swords',
  wands: 'Wands',
}

const rankNumber: Record<Rank, number> = {
  ace: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  page: 11,
  knight: 12,
  queen: 13,
  king: 14,
}

export function arcanaImage(arcana: Arcana): string {
  if (isMajor(arcana)) {
    const idx = majorIndexMap[arcana.major.name]
    const url = majorByIndex[idx]
    return url ?? ''
  }
  if (isMinor(arcana)) {
    const { rank, suit } = arcana.minor
    const nn = String(rankNumber[rank]).padStart(2, '0')
    const suitName = suitNameMap[suit]
    const key = `${suitName}${nn}`
    const url = minorByKey[key]
    return url ?? ''
  }
  return ''
}

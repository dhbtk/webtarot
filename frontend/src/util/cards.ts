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

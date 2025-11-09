use std::fmt::{Display, Formatter};
use rand::seq::SliceRandom;
use rand::{random, random_range, rng};
use std::hash::{DefaultHasher, Hash, Hasher};
use rand::distr::uniform::SampleRange;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

const MAX_SHUFFLES: usize = 7033;
const MAX_DRAWS: usize = 13;

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct Deck(Vec<Card>);

impl Deck {
    pub fn build() -> Deck {
        let mut cards = Vec::with_capacity(78);
        for major in MajorArcana::iter() {
            cards.push(Card { arcana: Arcana::Major { name: major }, flipped: false })
        }
        for suit in Suit::iter() {
            for rank in Rank::iter() {
                cards.push(Card { arcana: Arcana::Minor { rank, suit }, flipped: false })
            }
        }
        Deck(cards)
    }
    
    pub fn shuffle(&mut self, question: &str) -> usize {
        let mut hasher = DefaultHasher::new();
        question.hash(&mut hasher);
        let question_hash = (hasher.finish() % (MAX_SHUFFLES as u64)) as usize;
        let base_shuffle_count = (random::<u32>() % (MAX_SHUFFLES as u32)) as usize;
        let shuffles = (question_hash + base_shuffle_count) % MAX_SHUFFLES;
        let mut rng = rng();
        for _ in 0..shuffles {
            self.0.shuffle(&mut rng);
            for card in self.0.iter_mut() {
                card.flipped = random::<bool>();
            }
        }
        shuffles
    }
    
    pub fn draw(&self, count: usize) -> Vec<Card> {
        let mut indices: Vec<usize> = Vec::with_capacity(count);
        let slices = self.slice();
        let slice = slices[random_range(0..3)];
        for _ in 0..count {
            let mut index = random_range(0..(slice.len() - 1)) as usize;
            while indices.contains(&index) {
                index = random_range(0..(slice.len() - 1)) as usize;
            }
            indices.push(index);
        }
        
        indices.into_iter().map(|i| slice[i]).collect()
    }
    
    fn slice(&self) -> [&[Card]; 3] {
        let mut rng = rng();
        let second_slice_start_index = (MAX_DRAWS..(70 - MAX_DRAWS * 2)).sample_single(&mut rng).unwrap();
        let third_slice_start_index = ((second_slice_start_index + MAX_DRAWS)..(77 - MAX_DRAWS)).sample_single(&mut rng).unwrap();
        [
            &self.0[0..second_slice_start_index],
            &self.0[second_slice_start_index..third_slice_start_index],
            &self.0[third_slice_start_index..],
        ]
    }
}

impl Default for Deck {
    fn default() -> Self {
        Self::build()
    }
}

#[derive(Debug, Copy, Clone, Eq, PartialEq)]
pub struct Card {
    pub arcana: Arcana,
    pub flipped: bool,
}

impl Display for Card {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let flipped = if self.flipped { " (invertido)" } else { "" };
        write!(f, "{}{}", self.arcana, flipped)
    }
}

#[derive(Debug, Copy, Clone, Eq, PartialEq)]
pub enum Arcana {
    Major { name: MajorArcana },
    Minor { rank: Rank, suit: Suit },
}

impl Display for Arcana {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Arcana::Major { name, .. } => write!(f, "{}", name),
            Arcana::Minor { rank, suit } => write!(f, "{} de {}", rank, suit),
        }
    }
}

#[derive(Copy, Clone, EnumIter, Debug,Eq, PartialEq)]
pub enum MajorArcana {
    Fool,
    Magician,
    HighPriestess,
    Empress,
    Emperor,
    Hierophant,
    Lovers,
    Chariot,
    Strength,
    Hermit,
    WheelOfFortune,
    Justice,
    HangedMan,
    Death,
    Temperance,
    Devil,
    Tower,
    Star,
    Moon,
    Sun,
    Judgement,
    World
}

impl Display for MajorArcana {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let label: &str = match self {
            MajorArcana::Fool => "O Louco",
            MajorArcana::Magician => "O Mago",
            MajorArcana::HighPriestess => "A Suma Sacerdotisa",
            MajorArcana::Empress => "A Imperatriz",
            MajorArcana::Emperor => "O Imperador",
            MajorArcana::Hierophant => "O Hierofante",
            MajorArcana::Lovers => "Os Enamorados",
            MajorArcana::Chariot => "O Carro",
            MajorArcana::Strength => "A Força",
            MajorArcana::Hermit => "O Eremita",
            MajorArcana::WheelOfFortune => "A Roda da Fortuna",
            MajorArcana::Justice => "A Justiça",
            MajorArcana::HangedMan => "O Enforcado",
            MajorArcana::Death => "A Morte",
            MajorArcana::Temperance => "A Temperança",
            MajorArcana::Devil => "O Diabo",
            MajorArcana::Tower => "A Torre",
            MajorArcana::Star => "A Estrela",
            MajorArcana::Moon => "A Lua",
            MajorArcana::Sun => "O Sol",
            MajorArcana::Judgement => "O Julgamento",
            MajorArcana::World => "O Mundo"
        };
        write!(f, "{}", label)
    }
}

#[derive(Copy, Clone, EnumIter, Debug,Eq, PartialEq)]
pub enum Rank {
    Ace,
    Two,
    Three,
    Four,
    Five,
    Six,
    Seven,
    Eight,
    Nine,
    Ten,
    Page,
    Knight,
    Queen,
    King,
}

impl Display for Rank {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let label: &str = match self {
            Rank::Ace => "Ás",
            Rank::Two => "Dois",
            Rank::Three => "Três",
            Rank::Four => "Quatro",
            Rank::Five => "Cinco",
            Rank::Six => "Seis",
            Rank::Seven => "Sete",
            Rank::Eight => "Oito",
            Rank::Nine => "Nove",
            Rank::Ten => "Dez",
            Rank::Page => "Valete",
            Rank::Knight => "Cavaleiro",
            Rank::Queen => "Rainha",
            Rank::King => "Rei",
        };
        write!(f, "{}", label)
    }
}

#[derive(Copy, Clone, EnumIter, Debug,Eq, PartialEq)]
pub enum Suit {
    Cups,
    Pentacles,
    Swords,
    Wands
}

impl Display for Suit {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let label: &str = match self {
            Suit::Cups => "Copas",
            Suit::Pentacles => "Ouros",
            Suit::Swords => "Espadas",
            Suit::Wands => "Paus",
        };
        write!(f, "{}", label)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deck_build_works() {
        let deck = Deck::build();
        assert_eq!(78, deck.0.len());
    }
    
    #[test]
    fn shuffle_works() {
        let mut deck = Deck::build();
        deck.shuffle("this is a question");
        assert_ne!(Deck::build(), deck);
        for card in deck.0 {
            println!("* {}", card)
        }
    }
    
    #[test]
    fn draw_works() {
        let mut deck = Deck::build();
        deck.shuffle("this is a question");
        let cards = deck.draw(6);
        assert_eq!(6, cards.len());
        for card in cards {
            println!("* {}", card)
        }
    }

    #[test]
    fn slice_works() {
        let deck = Deck::build();
        let slices = deck.slice();
        assert_eq!(3, slices.len());
        assert_eq!(78, slices[0].len() + slices[1].len() + slices[2].len());
    }
}

use crate::t;
use rand::distr::uniform::SampleRange;
use rand::seq::SliceRandom;
use rand::{random, random_range, rng};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::fmt::{Display, Formatter};
use std::hash::{DefaultHasher, Hash, Hasher};
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

const MAX_SHUFFLES: usize = 7033;
const MAX_DRAWS: usize = 13;

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct Deck {
    pub cards: Vec<Card>,
}

impl Deck {
    pub fn build() -> Deck {
        let mut cards = Vec::with_capacity(78);
        for major in MajorArcana::iter() {
            cards.push(Card {
                arcana: Arcana::Major { name: major },
                flipped: false,
            })
        }
        for suit in Suit::iter() {
            for rank in Rank::iter() {
                cards.push(Card {
                    arcana: Arcana::Minor { rank, suit },
                    flipped: false,
                })
            }
        }
        Deck { cards }
    }

    pub fn shuffle(&mut self, question: &str) -> usize {
        let mut hasher = DefaultHasher::new();
        question.hash(&mut hasher);
        let question_hash = (hasher.finish() % (MAX_SHUFFLES as u64)) as usize;
        let base_shuffle_count = (random::<u32>() % (MAX_SHUFFLES as u32)) as usize;
        let shuffles = (question_hash + base_shuffle_count) % MAX_SHUFFLES;
        let mut rng = rng();
        for _ in 0..shuffles {
            self.cards.shuffle(&mut rng);
            for card in self.cards.iter_mut() {
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
        let second_slice_start_index = (MAX_DRAWS..(70 - MAX_DRAWS * 2))
            .sample_single(&mut rng)
            .unwrap();
        let third_slice_start_index = ((second_slice_start_index + MAX_DRAWS)..(77 - MAX_DRAWS))
            .sample_single(&mut rng)
            .unwrap();
        [
            &self.cards[0..second_slice_start_index],
            &self.cards[second_slice_start_index..third_slice_start_index],
            &self.cards[third_slice_start_index..],
        ]
    }
}

impl Default for Deck {
    fn default() -> Self {
        Self::build()
    }
}

#[derive(Debug, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub arcana: Arcana,
    pub flipped: bool,
}

impl Display for Card {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let flipped_suffix: Cow<'static, str> = if self.flipped {
            t!("card.flipped_suffix")
        } else {
            Cow::Borrowed("")
        };
        write!(f, "{}{}", self.arcana, flipped_suffix)
    }
}

#[derive(Debug, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "camelCase")]
pub enum Arcana {
    Major { name: MajorArcana },
    Minor { rank: Rank, suit: Suit },
}

impl Display for Arcana {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Arcana::Major { name, .. } => write!(f, "{}", name),
            Arcana::Minor { rank, suit } => {
                write!(f, "{}", t!("card.minor_format", rank = rank, suit = suit))
            }
        }
    }
}

#[derive(Copy, Clone, EnumIter, Debug, Eq, PartialEq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "camelCase")]
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
    World,
}

impl Display for MajorArcana {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let label = match self {
            MajorArcana::Fool => t!("card.major.Fool"),
            MajorArcana::Magician => t!("card.major.Magician"),
            MajorArcana::HighPriestess => t!("card.major.HighPriestess"),
            MajorArcana::Empress => t!("card.major.Empress"),
            MajorArcana::Emperor => t!("card.major.Emperor"),
            MajorArcana::Hierophant => t!("card.major.Hierophant"),
            MajorArcana::Lovers => t!("card.major.Lovers"),
            MajorArcana::Chariot => t!("card.major.Chariot"),
            MajorArcana::Strength => t!("card.major.Strength"),
            MajorArcana::Hermit => t!("card.major.Hermit"),
            MajorArcana::WheelOfFortune => t!("card.major.WheelOfFortune"),
            MajorArcana::Justice => t!("card.major.Justice"),
            MajorArcana::HangedMan => t!("card.major.HangedMan"),
            MajorArcana::Death => t!("card.major.Death"),
            MajorArcana::Temperance => t!("card.major.Temperance"),
            MajorArcana::Devil => t!("card.major.Devil"),
            MajorArcana::Tower => t!("card.major.Tower"),
            MajorArcana::Star => t!("card.major.Star"),
            MajorArcana::Moon => t!("card.major.Moon"),
            MajorArcana::Sun => t!("card.major.Sun"),
            MajorArcana::Judgement => t!("card.major.Judgement"),
            MajorArcana::World => t!("card.major.World"),
        };
        write!(f, "{}", label)
    }
}

#[derive(Copy, Clone, EnumIter, Debug, Eq, PartialEq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "camelCase")]
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
        let label = match self {
            Rank::Ace => t!("card.rank.Ace"),
            Rank::Two => t!("card.rank.Two"),
            Rank::Three => t!("card.rank.Three"),
            Rank::Four => t!("card.rank.Four"),
            Rank::Five => t!("card.rank.Five"),
            Rank::Six => t!("card.rank.Six"),
            Rank::Seven => t!("card.rank.Seven"),
            Rank::Eight => t!("card.rank.Eight"),
            Rank::Nine => t!("card.rank.Nine"),
            Rank::Ten => t!("card.rank.Ten"),
            Rank::Page => t!("card.rank.Page"),
            Rank::Knight => t!("card.rank.Knight"),
            Rank::Queen => t!("card.rank.Queen"),
            Rank::King => t!("card.rank.King"),
        };
        write!(f, "{}", label)
    }
}

#[derive(Copy, Clone, EnumIter, Debug, Eq, PartialEq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "camelCase")]
pub enum Suit {
    Cups,
    Pentacles,
    Swords,
    Wands,
}

impl Display for Suit {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let label = match self {
            Suit::Cups => t!("card.suit.Cups"),
            Suit::Pentacles => t!("card.suit.Pentacles"),
            Suit::Swords => t!("card.suit.Swords"),
            Suit::Wands => t!("card.suit.Wands"),
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
        assert_eq!(78, deck.cards.len());
    }

    #[test]
    fn shuffle_works() {
        let mut deck = Deck::build();
        deck.shuffle("this is a question");
        assert_ne!(Deck::build(), deck);
        for card in deck.cards {
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

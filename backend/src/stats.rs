use crate::reading::Reading;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use webtarot_shared::model::{Arcana, Deck};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub total_readings: u64,
    pub total_cards_drawn: u64,
    pub arcana_stats: Vec<ArcanaStats>,
    pub never_drawn: Vec<Arcana>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArcanaStats {
    pub arcana: Arcana,
    pub drawn_flipped_count: u64,
    pub drawn_count: u64,
    pub total_count: u64,
    pub percent_flipped: f64,
    pub percent_drawn: f64,
    pub percent_total: f64,
}

impl ArcanaStats {
    pub fn new(arcana: Arcana) -> Self {
        Self {
            arcana,
            drawn_flipped_count: 0,
            drawn_count: 0,
            total_count: 0,
            percent_flipped: 0.0,
            percent_drawn: 0.0,
            percent_total: 0.0,
        }
    }
}

pub fn calculate_stats(readings: &Vec<Reading>) -> Stats {
    let mut stats = Stats {
        total_readings: readings.len() as u64,
        total_cards_drawn: readings.iter().map(|r| r.cards.len()).sum::<usize>() as u64,
        arcana_stats: Vec::new(),
        never_drawn: Vec::new(),
    };
    let mut arcana_stats = HashMap::<Arcana, ArcanaStats>::new();
    for reading in readings {
        for card in &reading.cards {
            let arcana_stats = arcana_stats
                .entry(card.arcana)
                .or_insert_with(|| ArcanaStats::new(card.arcana));
            arcana_stats.total_count += 1;
            if card.flipped {
                arcana_stats.drawn_flipped_count += 1;
            } else {
                arcana_stats.drawn_count += 1;
            }
        }
    }
    stats.never_drawn = Deck::build()
        .cards
        .iter()
        .filter(|c| !arcana_stats.contains_key(&c.arcana))
        .map(|c| c.arcana)
        .collect();
    stats.arcana_stats = arcana_stats.into_values().collect();

    for stat in &mut stats.arcana_stats {
        stat.percent_flipped = stat.drawn_flipped_count as f64 / stat.total_count as f64;
        stat.percent_drawn = stat.drawn_count as f64 / stat.total_count as f64;
        stat.percent_total = stat.total_count as f64 / stats.total_cards_drawn as f64;
    }
    stats
}

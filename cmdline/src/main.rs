use clap::Parser;
use webtarot_shared::explain::InterpretationService;
use webtarot_shared::model::Deck;

#[derive(Parser, Debug)]
struct CliArgs {
    #[arg(short, long)]
    question: String,
    #[arg(short, long)]
    cards: usize,
    #[arg(short, long, default_value_t = true)]
    explain: bool,
}

#[tokio::main]
async fn main() {
    let args = CliArgs::parse();
    println!("{:?}", args);
    let mut deck = Deck::default();
    let shuffles = deck.shuffle(&args.question);

    println!(
        "A pergunta foi: {}\n\nEmbaralhando {} vezes...",
        args.question, shuffles
    );

    let cards = deck.draw(args.cards);
    println!("\n\n");
    for card in &cards {
        println!("  * {}", card);
    }

    if args.explain {
        println!("Interpretando...\n\n");
        let explanation = InterpretationService::new(std::env::var("OPENAI_KEY").unwrap())
            .explain(&args.question, None, &cards, None, None)
            .await;
        if let Ok(explanation) = explanation {
            println!("{}", explanation);
            return;
        } else {
            let error = explanation.unwrap_err();
            println!("Erro: {}", error);
        }
    }
}

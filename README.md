# Flashcard Study Game

A simple terminal-based flashcard game to help you study using JSON decks.

## Features
- Load flashcards from a JSON file (sample deck included)
- Optional shuffling and card limits for shorter sessions
- Filter cards by tags for focused practice
- List selected cards without starting a quiz

## Getting Started
1. Ensure you have Python 3.8+ installed.
2. Run the game with the included sample deck:
   ```bash
   python flashcard_game.py --deck data/sample_deck.json
   ```

## Commands and Options
- `--deck PATH` – Path to a JSON deck file (default: `data/sample_deck.json`).
- `--shuffle` – Shuffle the deck before quizzing.
- `--limit N` – Limit the number of cards shown in the session.
- `--tags tag1,tag2` – Filter cards by comma-separated tags.
- `--list` – List the selected cards instead of running a quiz.

Example: practice only programming cards, shuffled and limited to three:
```bash
python flashcard_game.py --tags programming --shuffle --limit 3
```

## Deck Format
Decks are JSON arrays where each object represents a card:
```json
{
  "question": "What is the capital of France?",
  "answer": "Paris",
  "hint": "It's known as the City of Light.",
  "tags": ["geography", "europe"]
}
```
Only `question` and `answer` are required; `hint` and `tags` are optional.

## Contributing Your Own Deck
1. Copy `data/sample_deck.json` to a new file, e.g., `my_deck.json`.
2. Add or edit cards following the format above.
3. Run the game with your deck:
   ```bash
   python flashcard_game.py --deck my_deck.json --shuffle
   ```

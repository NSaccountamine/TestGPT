"""A simple terminal flashcard game for studying.

Usage examples:
    python flashcard_game.py --deck data/sample_deck.json --shuffle
    python flashcard_game.py --deck my_deck.json --limit 5 --tags oop,web
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Sequence


@dataclass
class Card:
    question: str
    answer: str
    hint: Optional[str] = None
    tags: Optional[List[str]] = None

    @classmethod
    def from_dict(cls, data: dict) -> "Card":
        if "question" not in data or "answer" not in data:
            raise ValueError("Each card must include 'question' and 'answer' fields")
        tags = data.get("tags")
        if tags is not None and not isinstance(tags, list):
            raise ValueError("'tags' must be a list of strings if provided")
        return cls(
            question=str(data["question"]),
            answer=str(data["answer"]),
            hint=str(data.get("hint")) if data.get("hint") is not None else None,
            tags=[str(tag) for tag in tags] if tags else None,
        )


class Deck:
    def __init__(self, cards: Sequence[Card]):
        if not cards:
            raise ValueError("Deck cannot be empty")
        self.cards: List[Card] = list(cards)

    def filter_by_tags(self, tags: Iterable[str]) -> "Deck":
        tag_set = {tag.strip().lower() for tag in tags if tag.strip()}
        if not tag_set:
            return self
        filtered_cards = [
            card
            for card in self.cards
            if card.tags and tag_set.intersection({t.lower() for t in card.tags})
        ]
        if not filtered_cards:
            raise ValueError("No cards found with the provided tag filters")
        return Deck(filtered_cards)

    def shuffled(self) -> "Deck":
        cards = list(self.cards)
        random.shuffle(cards)
        return Deck(cards)

    def limited(self, limit: Optional[int]) -> "Deck":
        if limit is None:
            return self
        if limit <= 0:
            raise ValueError("Limit must be a positive integer")
        return Deck(self.cards[:limit])


class Quiz:
    def __init__(self, deck: Deck):
        self.deck = deck
        self.correct = 0
        self.total = 0

    def _prompt(self, prompt: str) -> str:
        try:
            return input(prompt)
        except EOFError:
            print("\nSession ended.")
            raise SystemExit(0)

    def run(self) -> None:
        for card in self.deck.cards:
            self.total += 1
            print(f"\nCard {self.total}/{len(self.deck.cards)}")
            print("Q:", card.question)
            if card.hint:
                see_hint = self._prompt("See hint? (y/N) ")
                if see_hint.lower().startswith("y"):
                    print("Hint:", card.hint)
            response = self._prompt("Your answer: ")
            if response.strip().lower() == card.answer.strip().lower():
                self.correct += 1
                print("✅ Correct!")
            else:
                print("❌ Not quite. Correct answer:", card.answer)
        print("\nSession complete!")
        print(f"Score: {self.correct}/{self.total} correct")


def load_deck(path: Path) -> Deck:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Deck file must contain a JSON list of cards")
    cards = [Card.from_dict(item) for item in data]
    return Deck(cards)


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Terminal flashcard study helper")
    parser.add_argument(
        "--deck",
        type=Path,
        default=Path("data/sample_deck.json"),
        help="Path to a JSON file containing flashcards",
    )
    parser.add_argument(
        "--shuffle",
        action="store_true",
        help="Shuffle the deck before quizzing",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit the number of cards for this session",
    )
    parser.add_argument(
        "--tags",
        type=str,
        help="Comma-separated list of tags to filter the deck",
    )
    parser.add_argument(
        "--list",
        dest="list_only",
        action="store_true",
        help="List the selected cards without starting a quiz",
    )
    return parser.parse_args(argv)


def build_deck(args: argparse.Namespace) -> Deck:
    deck = load_deck(args.deck)
    if args.tags:
        deck = deck.filter_by_tags(args.tags.split(","))
    if args.shuffle:
        deck = deck.shuffled()
    deck = deck.limited(args.limit)
    return deck


def list_cards(deck: Deck) -> None:
    for idx, card in enumerate(deck.cards, start=1):
        tags = f" [tags: {', '.join(card.tags)}]" if card.tags else ""
        print(f"{idx}. {card.question}{tags}")


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = parse_args(argv or sys.argv[1:])
    deck = build_deck(args)
    if args.list_only:
        list_cards(deck)
        return
    quiz = Quiz(deck)
    quiz.run()


if __name__ == "__main__":
    main()

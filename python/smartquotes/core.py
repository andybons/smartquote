"""Core smart quote conversion logic."""

import re
from dataclasses import dataclass
from typing import Final


@dataclass(frozen=True)
class QuoteChars:
    """Unicode quote characters."""

    LEFT_DOUBLE: str = "\u201C"
    RIGHT_DOUBLE: str = "\u201D"
    LEFT_SINGLE: str = "\u2018"
    RIGHT_SINGLE: str = "\u2019"
    STRAIGHT_DOUBLE: str = "\u0022"
    STRAIGHT_SINGLE: str = "\u0027"


QUOTES: Final[QuoteChars] = QuoteChars()

# Characters that indicate an opening quote should follow
_OPENING_CONTEXT: Final[frozenset[str]] = frozenset(
    [
        " ",
        "\t",
        "\n",
        "\r",  # whitespace
        "(",
        "[",
        "{",
        "<",  # left punctuation
        QUOTES.LEFT_DOUBLE,  # for nested quotes
        QUOTES.LEFT_SINGLE,
    ]
)

_LETTER_REGEX: Final[re.Pattern[str]] = re.compile(r"[a-zA-Z]")

# Words that drop their first letters, so a leading ' is an apostrophe and not
# an opening quote: 'til, 'tis, 'twas, 'em, 'cause, and the n of rock 'n' roll.
# Matched case-insensitively, as a whole word. 'round, 'bout and similar are
# left out: they are also ordinary quoted words.
# Keep in sync with ELISION_WORDS in packages/smartquote/src/index.ts.
_ELISION_WORDS: Final[tuple[str, ...]] = ("til", "tis", "twas", "em", "cause", "n")

# A decade or year with its first two digits dropped: '90s, '20s, '99
_ELISION_DIGITS_REGEX: Final[re.Pattern[str]] = re.compile(
    r"[0-9]{2}(?:s(?![A-Za-z0-9])|(?![A-Za-z0-9']))"
)
_ELISION_WORD_REGEX: Final[re.Pattern[str]] = re.compile(
    "(?:" + "|".join(_ELISION_WORDS) + ")(?![A-Za-z])", re.IGNORECASE | re.ASCII
)

# How many characters after a ' the elision rule reads.
_ELISION_LOOKAHEAD: Final[int] = max(len(word) for word in _ELISION_WORDS) + 1


def _is_letter(char: str) -> bool:
    """Check if a character is a letter."""
    return bool(_LETTER_REGEX.match(char))


def _is_elision(following: str) -> bool:
    """Check if the text after a ' starts an elided word or decade."""
    return bool(
        _ELISION_DIGITS_REGEX.match(following) or _ELISION_WORD_REGEX.match(following)
    )


def _is_opening_context(prev_char: str, is_start: bool, opposite_quote: str) -> bool:
    """Check if context indicates an opening quote."""
    return is_start or prev_char in _OPENING_CONTEXT or prev_char == opposite_quote


def _convert_char(char: str, prev_char: str, following: str, is_start: bool) -> str:
    """
    Core conversion logic for a single character.

    Returns the converted character for a given position. ``following`` holds up
    to ``_ELISION_LOOKAHEAD`` characters after ``char``.
    """
    if char == QUOTES.STRAIGHT_DOUBLE:
        if _is_opening_context(prev_char, is_start, QUOTES.LEFT_SINGLE):
            return QUOTES.LEFT_DOUBLE
        return QUOTES.RIGHT_DOUBLE

    if char == QUOTES.STRAIGHT_SINGLE:
        # Apostrophe: preceded by a letter AND followed by a letter
        if _is_letter(prev_char) and _is_letter(following[:1]):
            return QUOTES.RIGHT_SINGLE
        if _is_opening_context(prev_char, is_start, QUOTES.LEFT_DOUBLE):
            # Leading apostrophe of an elision ('90s, 'til) is not an opening quote
            return QUOTES.RIGHT_SINGLE if _is_elision(following) else QUOTES.LEFT_SINGLE
        return QUOTES.RIGHT_SINGLE

    return char


def convert_to_smart_quotes(text: str) -> str:
    """
    Convert straight quotes to smart quotes.

    Uses the algorithm from pensee.com/dunham/smartQuotes.html

    Opening quote rules - use opening quotes when:
    - At beginning of text
    - Following whitespace (space, tab, newline)
    - After left punctuation: ( [ { <
    - After opening quote of opposite type (for nested quotes)

    Closing quote rules - use closing quotes in all other cases.

    Apostrophes - single quotes inside words use right single quote.

    Elisions - a ' that would open a quote uses right single quote when it
    starts a decade ('90s) or a word that dropped its first letters ('til,
    'tis, 'twas, 'em, 'cause, rock 'n' roll).

    Args:
        text: The text to convert.

    Returns:
        The text with straight quotes converted to smart quotes.
    """
    result: list[str] = []

    for i, char in enumerate(text):
        prev_char = text[i - 1] if i > 0 else ""
        following = text[i + 1 : i + 1 + _ELISION_LOOKAHEAD]
        result.append(_convert_char(char, prev_char, following, i == 0))

    return "".join(result)


def _has_straight_quotes(text: str) -> bool:
    """Check if a string contains any straight quotes that need conversion."""
    return QUOTES.STRAIGHT_DOUBLE in text or QUOTES.STRAIGHT_SINGLE in text


_PLACEHOLDER_PREFIX: Final[str] = "<<SMART_QUOTES_CODE_BLOCK_"
_PLACEHOLDER_SUFFIX: Final[str] = ">>"


@dataclass
class _CodeBlock:
    """A code block with its placeholder and original content."""

    placeholder: str
    content: str


def smart_quote_markdown(text: str) -> str:
    """
    Markdown-aware smart quote conversion.

    Preserves straight quotes inside:
    - Fenced code blocks (```...```)
    - Inline code (`...`)
    - Indented code blocks (4 spaces or tab at line start)

    Args:
        text: The markdown text to convert.

    Returns:
        The text with smart quotes, preserving code blocks.
    """
    # Early exit: no quotes to convert
    if not _has_straight_quotes(text):
        return text

    code_blocks: list[_CodeBlock] = []
    placeholder_index = 0

    def create_placeholder(match: re.Match[str]) -> str:
        nonlocal placeholder_index
        content = match.group(0)
        placeholder = f"{_PLACEHOLDER_PREFIX}{placeholder_index}{_PLACEHOLDER_SUFFIX}"
        code_blocks.append(_CodeBlock(placeholder=placeholder, content=content))
        placeholder_index += 1
        return placeholder

    processed = text

    # IMPORTANT: Order matters! Process in this sequence:
    # 1. Fenced blocks first (``` delimiters are most specific)
    # 2. Inline code second (backticks that weren't part of fenced blocks)
    # 3. Indented blocks last (4-space/tab indentation)

    # 1. Extract fenced code blocks (```...```)
    processed = re.sub(r"```[\s\S]*?```", create_placeholder, processed)

    # 2. Extract inline code - use backreference to ensure matching backtick counts
    # Handles: `code`, ``code with ` inside``, and empty spans like ``
    processed = re.sub(r"(`+)[\s\S]*?\1", create_placeholder, processed)

    # 3. Extract indented code blocks (4 spaces or tab at start of line)
    processed = re.sub(
        r"(?:^|\n)((?:[ ]{4}|\t).*(?:\n(?:[ ]{4}|\t).*)*)",
        create_placeholder,
        processed,
    )

    # 4. Apply smart quote conversion to remaining prose
    processed = convert_to_smart_quotes(processed)

    # 5. Restore code blocks from placeholders
    for block in code_blocks:
        processed = processed.replace(block.placeholder, block.content)

    return processed

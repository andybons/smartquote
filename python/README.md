# smartquotes (Python)

Smart quote conversion utilities for typographically correct quotes.

## Installation

```bash
pip install smartquotes
```

## Usage

```python
from smartquotes import convert_to_smart_quotes, smart_quote_markdown

# Basic conversion
text = convert_to_smart_quotes('"Hello," she said. "It\'s a beautiful day!"')
# → "Hello," she said. "It's a beautiful day!"

# Markdown-aware conversion (preserves code blocks)
markdown = smart_quote_markdown('''
"This will be converted"

```python
"This stays straight"
```
''')
```

## API

### `convert_to_smart_quotes(text: str) -> str`

Converts straight quotes to smart quotes using context-aware rules:

- Opening quotes after whitespace, start of text, or left punctuation
- Closing quotes in all other contexts
- Apostrophes (single quotes inside words) use right single quote

### `smart_quote_markdown(text: str) -> str`

Markdown-aware conversion that preserves straight quotes in:

- Fenced code blocks (`` ``` ``)
- Inline code (`` ` ``)
- Indented code blocks (4 spaces or tab)

### `QUOTES`

Named constants for quote characters:

```python
from smartquotes import QUOTES

QUOTES.LEFT_DOUBLE   # "
QUOTES.RIGHT_DOUBLE  # "
QUOTES.LEFT_SINGLE   # '
QUOTES.RIGHT_SINGLE  # '
QUOTES.STRAIGHT_DOUBLE  # "
QUOTES.STRAIGHT_SINGLE  # '
```

## License

MIT

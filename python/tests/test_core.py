"""Tests for smart quote conversion."""

from smartquotes import QUOTES, convert_to_smart_quotes, smart_quote_markdown


class TestConvertToSmartQuotes:
    """Tests for convert_to_smart_quotes function."""

    def test_double_quotes_basic(self) -> None:
        result = convert_to_smart_quotes('"Hello"')
        assert result == f"{QUOTES.LEFT_DOUBLE}Hello{QUOTES.RIGHT_DOUBLE}"

    def test_single_quotes_basic(self) -> None:
        result = convert_to_smart_quotes("'Hello'")
        assert result == f"{QUOTES.LEFT_SINGLE}Hello{QUOTES.RIGHT_SINGLE}"

    def test_apostrophe_in_word(self) -> None:
        result = convert_to_smart_quotes("it's")
        assert result == f"it{QUOTES.RIGHT_SINGLE}s"

    def test_apostrophe_contraction(self) -> None:
        result = convert_to_smart_quotes("don't")
        assert result == f"don{QUOTES.RIGHT_SINGLE}t"

    def test_nested_quotes(self) -> None:
        result = convert_to_smart_quotes("\"She said 'hello'\"")
        expected = (
            f"{QUOTES.LEFT_DOUBLE}She said "
            f"{QUOTES.LEFT_SINGLE}hello{QUOTES.RIGHT_SINGLE}"
            f"{QUOTES.RIGHT_DOUBLE}"
        )
        assert result == expected

    def test_quote_after_whitespace(self) -> None:
        result = convert_to_smart_quotes('He said "yes"')
        assert result == f"He said {QUOTES.LEFT_DOUBLE}yes{QUOTES.RIGHT_DOUBLE}"

    def test_quote_after_parenthesis(self) -> None:
        result = convert_to_smart_quotes('("quote")')
        assert result == f"({QUOTES.LEFT_DOUBLE}quote{QUOTES.RIGHT_DOUBLE})"

    def test_empty_string(self) -> None:
        assert convert_to_smart_quotes("") == ""

    def test_no_quotes(self) -> None:
        assert convert_to_smart_quotes("Hello world") == "Hello world"


class TestSmartQuoteMarkdown:
    """Tests for smart_quote_markdown function."""

    def test_preserves_fenced_code_block(self) -> None:
        text = '```\ncode with "quotes"\n```'
        result = smart_quote_markdown(text)
        assert result == text

    def test_preserves_inline_code(self) -> None:
        text = 'Text with `"inline"` code'
        result = smart_quote_markdown(text)
        assert f'{QUOTES.LEFT_DOUBLE}inline{QUOTES.RIGHT_DOUBLE}' not in result
        assert '`"inline"`' in result

    def test_converts_prose_around_code(self) -> None:
        text = '"Hello" and `code` and "world"'
        result = smart_quote_markdown(text)
        assert f"{QUOTES.LEFT_DOUBLE}Hello{QUOTES.RIGHT_DOUBLE}" in result
        assert f"{QUOTES.LEFT_DOUBLE}world{QUOTES.RIGHT_DOUBLE}" in result
        assert "`code`" in result

    def test_no_quotes_returns_unchanged(self) -> None:
        text = "No quotes here"
        assert smart_quote_markdown(text) == text

    def test_indented_code_block(self) -> None:
        text = 'Text before\n\n    code with "quotes"\n\nText after "quoted"'
        result = smart_quote_markdown(text)
        # Indented code should be preserved
        assert '"quotes"' in result
        # Prose should be converted
        assert f"{QUOTES.LEFT_DOUBLE}quoted{QUOTES.RIGHT_DOUBLE}" in result

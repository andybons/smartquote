"""Tests for smart quote conversion."""

import pytest

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


class TestLeadingElisions:
    """A leading apostrophe of an elision is a right single quote."""

    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("the '90s", "the \u201990s"),
            ("the '20s were loud", "the \u201920s were loud"),
            ("class of '99.", "class of \u201999."),
            ("'90s kids", "\u201990s kids"),
            ("wait 'til dark", "wait \u2019til dark"),
            ("'Tis the season", "\u2019Tis the season"),
            ("'twas the night", "\u2019twas the night"),
            ("let 'em go", "let \u2019em go"),
            ("'cause I said so", "\u2019cause I said so"),
            ("rock 'n' roll", "rock \u2019n\u2019 roll"),
            ("Rock 'N' Roll", "Rock \u2019N\u2019 Roll"),
            ('"\'Tis true," he said', "\u201C\u2019Tis true,\u201D he said"),
            ("(the '90s)", "(the \u201990s)"),
        ],
    )
    def test_elision(self, text: str, expected: str) -> None:
        assert convert_to_smart_quotes(text) == expected

    def test_real_quoted_word_stays_open(self) -> None:
        result = convert_to_smart_quotes("He said 'hello' to me")
        assert result == (
            f"He said {QUOTES.LEFT_SINGLE}hello{QUOTES.RIGHT_SINGLE} to me"
        )

    @pytest.mark.parametrize(
        "word",
        ["tilde", "embers", "causes", "no", "round", "2024", "5", "123", "42"],
    )
    def test_words_and_numbers_that_are_not_elisions_stay_open(self, word: str) -> None:
        result = convert_to_smart_quotes(f"a '{word}' b")
        assert result == f"a {QUOTES.LEFT_SINGLE}{word}{QUOTES.RIGHT_SINGLE} b"

    def test_markdown_prose_gets_elisions_and_code_is_untouched(self) -> None:
        result = smart_quote_markdown("the '90s and `'90s`")
        assert result == "the \u201990s and `'90s`"


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

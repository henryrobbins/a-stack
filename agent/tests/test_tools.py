import pytest

from agent.tools import calculator, current_time


@pytest.mark.parametrize(
    ("expression", "expected"),
    [
        ("1 + 2 * 3", "7"),
        ("(1 + 2) * 3", "9"),
        ("2 ** 10", "1024"),
        ("7 / 2", "3.5"),
        ("7 // 2", "3"),
        ("-4 % 3", "2"),
        ("1.5e3 - 0.5", "1499.5"),
    ],
)
def test_calculator_evaluates_arithmetic(expression: str, expected: str) -> None:
    assert calculator(expression) == expected


@pytest.mark.parametrize(
    "expression",
    [
        "__import__('os').system('ls')",
        "x + 1",
        "abs(-1)",
        "[1, 2]",
        "'a' * 3",
        "1 if True else 2",
    ],
)
def test_calculator_rejects_anything_but_arithmetic(expression: str) -> None:
    with pytest.raises(ValueError):
        calculator(expression)


def test_calculator_rejects_division_by_zero() -> None:
    with pytest.raises(ValueError, match="division by zero"):
        calculator("1 / 0")


def test_calculator_rejects_huge_exponents() -> None:
    with pytest.raises(ValueError, match="too large"):
        calculator("9 ** 9 ** 9")


def test_calculator_rejects_syntax_errors() -> None:
    with pytest.raises(ValueError):
        calculator("1 +")


def test_current_time_in_zone() -> None:
    result = current_time("Asia/Tokyo")

    assert result.endswith("+09:00")


def test_current_time_rejects_unknown_zone() -> None:
    with pytest.raises(ValueError, match="Unknown time zone"):
        current_time("Mars/Olympus")


def test_calculator_rejects_booleans() -> None:
    with pytest.raises(ValueError):
        calculator("True + 1")

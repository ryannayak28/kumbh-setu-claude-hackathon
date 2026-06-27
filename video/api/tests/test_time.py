from app.utils.time import format_timestamp


def test_format_timestamp_under_an_hour() -> None:
    assert format_timestamp(0) == "00:00"
    assert format_timestamp(192.4) == "03:12"


def test_format_timestamp_over_an_hour() -> None:
    assert format_timestamp(3723.9) == "1:02:03"


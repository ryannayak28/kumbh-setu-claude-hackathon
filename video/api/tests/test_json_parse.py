import pytest

from app.utils.json_parse import extract_json_object


def test_extract_json_object_plain() -> None:
    assert extract_json_object('{"matches": []}') == {"matches": []}


def test_extract_json_object_from_fence() -> None:
    text = '```json\n{"matches": [{"crop_id": "CROP_000001"}]}\n```'
    assert extract_json_object(text)["matches"][0]["crop_id"] == "CROP_000001"


def test_extract_json_object_from_wrapped_text() -> None:
    text = 'Result:\n{"matches": []}\nDone'
    assert extract_json_object(text) == {"matches": []}


def test_extract_json_object_raises_for_missing_object() -> None:
    with pytest.raises(ValueError):
        extract_json_object("no json here")


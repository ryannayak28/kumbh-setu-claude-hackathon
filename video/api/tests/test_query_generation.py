from app.localization.schemas import EventHint, LocationClue
from app.localization.utils import generate_location_queries, normalize_clues
from app.localization.nashik_gazetteer import clue_matches_by_zone


def _clue(value: str, clue_id: str = "CLUE_001") -> LocationClue:
    return LocationClue(
        clue_id=clue_id,
        type="text_sign",
        value=value,
        normalized_value=value.lower(),
        confidence=0.8,
        frame_ids=["FRAME_000001"],
    )


def test_ramkund_alias_generates_nashik_scoped_queries() -> None:
    queries = generate_location_queries(
        clues=[_clue("RAMKUND", "CLUE_001"), _clue("GODAGHAT", "CLUE_002")],
        event_hint=EventHint(
            event_name="Nashik-Trimbakeshwar Simhastha",
            city="Nashik / Trimbakeshwar",
            country="India",
            extra_keywords=["godavari"],
        ),
    )

    assert "Ramkund" in queries[0].query
    assert "Godavari" in queries[0].query
    assert "Nashik" in queries[0].query
    assert queries[0].source_clue_ids == ["CLUE_001", "CLUE_002"]


def test_kushawarta_alias_maps_to_trimbak_zone() -> None:
    matches = clue_matches_by_zone([_clue("KUSHAVART", "CLUE_001"), _clue("TRIMBAKESHWAR", "CLUE_002")])

    assert [clue.clue_id for clue in matches["KUSHAWARTA_TRIMBAK"]] == ["CLUE_001", "CLUE_002"]


def test_panchavati_alias_maps_to_godavari_zone() -> None:
    matches = clue_matches_by_zone([_clue("PANCHAVATI", "CLUE_001")])

    assert [clue.clue_id for clue in matches["NASHIK_GODAVARI_RAMKUND"]] == ["CLUE_001"]


def test_normalize_clues_dedupes_repeated_ocr_values() -> None:
    clues = normalize_clues([_clue("RAMKUND"), _clue("Ramkund", "CLUE_002")])

    assert len(clues) == 1
    assert clues[0].normalized_value == "ramkund"

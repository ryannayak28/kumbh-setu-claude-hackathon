from app.localization.nashik_gazetteer import filter_results_to_allowed_zones
from app.localization.ranker import rank_candidate_locations
from app.localization.schemas import EventHint, LatLng, LocationClue, SourceResult


def _clue(value: str, clue_id: str) -> LocationClue:
    return LocationClue(
        clue_id=clue_id,
        type="text_sign",
        value=value,
        normalized_value=value.lower(),
        confidence=0.9,
        frame_ids=["FRAME_000001"],
    )


def test_geofence_keeps_in_zone_and_discards_out_of_zone_results() -> None:
    results = [
        SourceResult(
            source="google_places",
            name="Ramkund",
            address="Panchavati, Nashik",
            lat=20.0068,
            lng=73.7907,
            raw_score=0.9,
        ),
        SourceResult(
            source="nominatim",
            name="High confidence wrong city",
            address="Prayagraj",
            lat=25.43601,
            lng=81.84701,
            raw_score=0.99,
        ),
    ]

    kept, discarded = filter_results_to_allowed_zones(results)

    assert discarded == 1
    assert len(kept) == 1
    assert kept[0].metadata["zone_id"] == "NASHIK_GODAVARI_RAMKUND"


def test_ranker_prioritizes_godavari_zone_for_ramkund_clues() -> None:
    clues = [_clue("Ramkund", "CLUE_001"), _clue("Godaghat", "CLUE_002")]
    event_hint = EventHint(approx_center=LatLng(lat=19.9696921, lng=73.6616225), search_radius_m=35000)

    ranked = rank_candidate_locations(
        source_results=[],
        clues=clues,
        evidence_frames=[],
        event_hint=event_hint,
        top_k=5,
    )

    assert len(ranked) == 2
    assert ranked[0].zone_id == "NASHIK_GODAVARI_RAMKUND"
    assert ranked[0].confidence_label == "likely"
    assert ranked[0].within_allowed_zone is True
    assert ranked[1].confidence_label == "weak"


def test_ranker_prioritizes_kushawarta_zone_for_trimbak_clues() -> None:
    clues = [_clue("Trimbakeshwar", "CLUE_001"), _clue("Kushawarta", "CLUE_002")]

    ranked = rank_candidate_locations(
        source_results=[],
        clues=clues,
        evidence_frames=[],
        event_hint=EventHint(),
        top_k=5,
    )

    assert ranked[0].zone_id == "KUSHAWARTA_TRIMBAK"
    assert ranked[0].confidence_label == "likely"


def test_ranker_returns_both_zones_as_low_confidence_when_no_zone_clues() -> None:
    ranked = rank_candidate_locations(
        source_results=[],
        clues=[_clue("unreadable banner", "CLUE_001")],
        evidence_frames=[],
        event_hint=EventHint(),
        top_k=5,
    )

    assert [item.zone_id for item in ranked] == ["NASHIK_GODAVARI_RAMKUND", "KUSHAWARTA_TRIMBAK"]
    assert all(item.confidence_label == "weak" for item in ranked)

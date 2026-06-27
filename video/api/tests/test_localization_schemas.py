import pytest
from pydantic import ValidationError

from app.localization.schemas import EventHint, LatLng, LocalizeRequest


def test_localize_request_accepts_normal_event_hint() -> None:
    request = LocalizeRequest(
        window_before_sec=45,
        window_after_sec=45,
        sample_fps=1.0,
        event_hint=EventHint(
            event_name="Nashik-Trimbakeshwar Simhastha",
            city="Nashik / Trimbakeshwar",
            country="India",
            approx_center=LatLng(lat=19.9696921, lng=73.6616225),
            search_radius_m=35000,
            extra_keywords=["ramkund", "kushawarta"],
        ),
    )

    assert request.event_hint.city == "Nashik / Trimbakeshwar"
    assert request.event_hint.approx_center is not None


def test_localize_request_rejects_invalid_sampling_and_window() -> None:
    with pytest.raises(ValidationError):
        LocalizeRequest(window_before_sec=0, sample_fps=-1)

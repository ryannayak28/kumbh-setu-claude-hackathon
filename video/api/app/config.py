from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


API_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    output_root: Path = Path("outputs/jobs")
    upload_max_mb: int = 800

    vlm_provider: Literal["claude", "gemini", "openai", "mock"] = "claude"

    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"
    gemini_api_key: str | None = None
    openai_api_key: str | None = None

    default_sample_fps: float = 1.0
    default_max_people_per_frame: int = 8
    default_min_person_height: int = 80
    default_yolo_model: str = "yolov8n.pt"
    default_yolo_conf: float = 0.25
    contact_sheet_size: int = 12
    top_results: int = 20
    clip_seconds_before: float = 3.0
    clip_seconds_after: float = 5.0
    dedup_window_seconds: float = 2.5

    localization_enabled: bool = True
    localization_default_before_sec: int = 60
    localization_default_after_sec: int = 60
    localization_default_sample_fps: float = 1.0
    localization_max_context_frames: int = 120
    localization_top_frames_for_vlm: int = 24
    localization_top_location_results: int = 5

    ocr_provider: Literal["google_vision", "easyocr", "mock", "none"] = "google_vision"
    google_application_credentials: str | None = None
    google_cloud_project: str | None = None

    google_maps_api_key: str | None = None
    google_places_enabled: bool = True
    nominatim_enabled: bool = True
    nominatim_base_url: str = "https://nominatim.openstreetmap.org"
    nominatim_user_agent: str = "lost-person-pov-search-mvp/0.1"
    overpass_enabled: bool = False
    overpass_base_url: str = "https://overpass-api.de/api/interpreter"

    web_grounding_provider: Literal["none", "gemini", "openai"] = "none"
    gemini_web_grounding_model: str = "gemini-2.5-flash"
    openai_web_search_model: str = "gpt-5.1-mini"

    default_event_name: str | None = "Nashik-Trimbakeshwar Simhastha"
    default_event_city: str | None = "Nashik / Trimbakeshwar"
    default_event_country: str | None = "India"
    default_event_center_lat: float | None = 19.9696921
    default_event_center_lng: float | None = 73.6616225
    default_event_radius_m: int = 35000
    default_event_keywords: str = (
        "ramkund,godaghat,godavari,panchavati,ganga godavari,ghat,"
        "kushawarta,kushavart,kusavarta,trimbak,trimbakeshwar,brahmagiri,godavari source"
    )

    allowed_video_extensions: set[str] = Field(
        default_factory=lambda: {".mp4", ".mov", ".webm", ".avi", ".mkv"}
    )
    allowed_image_extensions: set[str] = Field(
        default_factory=lambda: {".jpg", ".jpeg", ".png", ".webp"}
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def output_root_path(self) -> Path:
        if self.output_root.is_absolute():
            return self.output_root
        return API_DIR / self.output_root


settings = Settings()

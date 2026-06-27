export type LatLng = {
  lat: number;
  lng: number;
};

export type EventHint = {
  event_name?: string | null;
  city?: string | null;
  country?: string | null;
  approx_center?: LatLng | null;
  search_radius_m: number;
  extra_keywords: string[];
};

export type LocalizeRequest = {
  window_before_sec: number;
  window_after_sec: number;
  sample_fps: number;
  event_hint: EventHint;
};

export type LocalizationStatusValue = "queued" | "running" | "completed" | "failed";

export type EvidenceFrame = {
  frame_id: string;
  timestamp_sec: number;
  timestamp_mmss: string;
  image_path?: string;
  image_url: string;
  selected_for_vlm: boolean;
  ocr_text: string[];
  visual_summary?: string | null;
  sharpness?: number | null;
};

export type LocationClue = {
  clue_id: string;
  type:
    | "text_sign"
    | "landmark"
    | "route_marker"
    | "shop"
    | "event_structure"
    | "natural_feature"
    | "road_layout"
    | "other";
  value: string;
  normalized_value: string;
  confidence: number;
  frame_ids: string[];
  timestamp_mmss?: string | null;
  why_it_matters?: string | null;
};

export type SearchQuery = {
  query_id: string;
  query: string;
  source_clue_ids: string[];
};

export type SourceResult = {
  source: string;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  raw_score?: number | null;
  url?: string | null;
  metadata: Record<string, unknown>;
};

export type CandidateLocation = {
  candidate_location_id: string;
  name: string;
  lat: number;
  lng: number;
  confidence: number;
  confidence_label: "likely" | "possible" | "weak";
  radius_m: number;
  zone_id?: string | null;
  zone_name?: string | null;
  zone_relation_score?: number | null;
  within_allowed_zone?: boolean;
  matched_clues: string[];
  evidence_frame_ids: string[];
  sources: string[];
  source_results: SourceResult[];
  uncertainties: string[];
  map_url?: string | null;
};

export type LocalizationResult = {
  localization_id: string;
  job_id: string;
  candidate_id: string;
  status: LocalizationStatusValue;
  progress?: {
    stage: string;
    message: string;
    percent: number;
  } | null;
  sighting?: {
    timestamp_sec: number;
    timestamp_mmss: string;
    clip_url?: string | null;
    frame_url?: string | null;
    thumbnail_url?: string | null;
  } | null;
  event_hint?: EventHint | null;
  evidence_frames: EvidenceFrame[];
  extracted_clues: LocationClue[];
  search_queries: SearchQuery[];
  candidate_locations: CandidateLocation[];
  debug?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  } | null;
};

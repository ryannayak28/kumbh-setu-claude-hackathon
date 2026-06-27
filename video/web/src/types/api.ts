export type JobStatusValue =
  | "queued"
  | "extracting"
  | "sheeting"
  | "scoring"
  | "clipping"
  | "done"
  | "error";

export interface JobStatus {
  job_id: string;
  status: JobStatusValue;
  stage: string;
  progress: number;
  counts: {
    sampled_frames?: number;
    person_crops?: number;
    contact_sheets?: number;
    scored_sheets?: number;
    results?: number;
  };
  error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  rank: number;
  crop_id: string;
  score: number;
  timestamp_sec: number;
  timestamp_label: string;
  thumbnail_url: string;
  clip_url?: string | null;
  frame_url: string;
  matched_attributes: string[];
  missing_or_unclear_attributes: string[];
  reason: string;
}

export interface ResultsResponse {
  job_id: string;
  target_description: string;
  reference_image_url?: string | null;
  scoring_provider?: string | null;
  scoring_model?: string | null;
  results: SearchResult[];
}

import type { LocalizeRequest, LocalizationResult } from "@/types/localization";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail ?? body?.message ?? response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return body as T;
}

export async function startLocalization(
  jobId: string,
  candidateId: string,
  body: LocalizeRequest,
): Promise<{ localization_id: string; job_id: string; candidate_id: string; status: string; status_url: string }> {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}/candidates/${candidateId}/localize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson(response);
}

export async function getLocalization(jobId: string, localizationId: string): Promise<LocalizationResult> {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}/localizations/${localizationId}`, {
    method: "GET",
    cache: "no-store",
  });
  return readJson(response);
}


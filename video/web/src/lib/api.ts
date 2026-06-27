import type { JobStatus, ResultsResponse } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail ?? body?.message ?? response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return body as T;
}

export async function createJob(form: FormData): Promise<{ job_id: string; status: string }> {
  const response = await fetch(`${API_BASE}/api/jobs`, {
    method: "POST",
    body: form,
  });
  return readJson(response);
}

export async function getJob(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    cache: "no-store",
  });
  return readJson(response);
}

export async function getResults(jobId: string): Promise<ResultsResponse> {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}/results`, {
    cache: "no-store",
  });
  return readJson(response);
}

export function assetUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${API_BASE}${path}`;
  }
  return `${API_BASE}/${path}`;
}


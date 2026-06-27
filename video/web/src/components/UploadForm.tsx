"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Search, Upload, Video } from "lucide-react";
import { createJob } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { ErrorBox } from "@/components/ErrorBox";
import { SettingsPanel } from "@/components/SettingsPanel";
import type { SearchSettings } from "@/components/SettingsPanel";

const DEFAULT_SETTINGS: SearchSettings = {
  sample_fps: 1,
  max_people_per_frame: 8,
  min_person_height: 80,
  yolo_conf: 0.25,
};

export function UploadForm() {
  const router = useRouter();
  const [video, setVideo] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [targetDescription, setTargetDescription] = useState("");
  const [settings, setSettings] = useState<SearchSettings>(DEFAULT_SETTINGS);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!video) {
      setVideoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(video);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  useEffect(() => {
    if (!referenceImage) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(referenceImage);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceImage]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!video) {
      setError("Choose a POV video before starting the search.");
      return;
    }
    if (targetDescription.trim().length < 10) {
      setError("Describe the visible appearance in at least 10 characters.");
      return;
    }

    const form = new FormData();
    form.append("video", video);
    if (referenceImage) {
      form.append("reference_image", referenceImage);
    }
    form.append("target_description", targetDescription.trim());
    form.append("sample_fps", String(settings.sample_fps));
    form.append("max_people_per_frame", String(settings.max_people_per_frame));
    form.append("min_person_height", String(settings.min_person_height));
    form.append("yolo_conf", String(settings.yolo_conf));

    setSubmitting(true);
    try {
      const response = await createJob(form);
      router.push(`/jobs/${response.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the search job.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4 shadow-sm sm:p-6"
    >
      <div className="grid gap-6">
        {error ? <ErrorBox title="Could not start search" message={error} /> : null}

        <label className="grid gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
            <Video aria-hidden="true" className="h-4 w-4 text-[color:var(--accent)]" />
            POV video
          </span>
          <input
            accept=".mp4,.mov,.webm,.avi,.mkv"
            className="block w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 text-sm text-[color:var(--text)] file:mr-4 file:rounded-md file:border-0 file:bg-[color:var(--accent)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            type="file"
            onChange={(event) => setVideo(event.target.files?.[0] ?? null)}
          />
          {video ? (
            <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-subtle)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="font-medium text-[color:var(--text)]">{video.name}</span>
                <span className="text-[color:var(--muted)]">{formatBytes(video.size)}</span>
              </div>
              {videoPreviewUrl ? (
                <video
                  className="mt-3 aspect-video w-full rounded-md border border-[color:var(--line)] bg-black object-contain"
                  controls
                  muted
                  src={videoPreviewUrl}
                />
              ) : null}
            </div>
          ) : null}
        </label>

        <label className="grid gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
            <ImagePlus aria-hidden="true" className="h-4 w-4 text-[color:var(--accent)]" />
            Reference image
            <span className="font-normal text-[color:var(--muted)]">optional</span>
          </span>
          <input
            accept=".jpg,.jpeg,.png,.webp"
            className="block w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-2 text-sm text-[color:var(--text)] file:mr-4 file:rounded-md file:border-0 file:bg-[color:var(--surface)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[color:var(--text)]"
            type="file"
            onChange={(event) => setReferenceImage(event.target.files?.[0] ?? null)}
          />
          {referenceImage && imagePreviewUrl ? (
            <div className="flex items-center gap-4 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-subtle)] p-3">
              <img
                alt="Reference image preview"
                className="h-24 w-24 rounded-md border border-[color:var(--line)] object-cover"
                src={imagePreviewUrl}
              />
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-[color:var(--text)]">{referenceImage.name}</p>
                <p className="mt-1 text-[color:var(--muted)]">{formatBytes(referenceImage.size)}</p>
              </div>
            </div>
          ) : null}
        </label>

        <label className="grid gap-3">
          <span className="text-sm font-semibold text-[color:var(--text)]">Target appearance</span>
          <textarea
            className="min-h-36 resize-y rounded-md border border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-3 py-3 text-sm leading-6 text-[color:var(--text)] placeholder:text-[color:var(--muted)]"
            placeholder="Example: elderly man, white kurta, saffron/orange scarf, black backpack, holding a blue plastic bag. Last seen walking near barricades."
            value={targetDescription}
            onChange={(event) => setTargetDescription(event.target.value)}
          />
        </label>

        <SettingsPanel settings={settings} onChange={setSettings} />

        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 dark:text-zinc-950"
          disabled={submitting}
          type="submit"
        >
          {submitting ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Search aria-hidden="true" className="h-4 w-4" />
          )}
          {submitting ? "Uploading" : "Search video"}
        </button>

        <div className="flex items-start gap-2 text-xs leading-5 text-[color:var(--muted)]">
          <Upload aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            Video uploads go directly to the local FastAPI backend and are stored under api/outputs/jobs.
          </span>
        </div>
      </div>
    </form>
  );
}

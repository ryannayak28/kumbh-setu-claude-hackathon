import { assetUrl } from "@/lib/api";
import type { EvidenceFrame } from "@/types/localization";

export function EvidenceFrameCard({ frame }: { frame: EvidenceFrame }) {
  return (
    <article className="overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)]">
      <img
        alt={`${frame.frame_id} at ${frame.timestamp_mmss}`}
        className="aspect-video w-full bg-black object-cover"
        src={assetUrl(frame.image_url)}
      />
      <div className="grid gap-2 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-semibold text-[color:var(--text)]">{frame.timestamp_mmss}</span>
          {frame.selected_for_vlm ? (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 font-medium text-teal-950 dark:bg-teal-300/15 dark:text-teal-100">
              selected
            </span>
          ) : null}
        </div>
        <span className="truncate font-mono text-[color:var(--muted)]">{frame.frame_id}</span>
        {frame.ocr_text.length ? (
          <p className="line-clamp-2 text-[color:var(--text)]">OCR: {frame.ocr_text.join(" | ")}</p>
        ) : null}
        {frame.visual_summary ? (
          <p className="line-clamp-2 text-[color:var(--muted)]">{frame.visual_summary}</p>
        ) : null}
      </div>
    </article>
  );
}


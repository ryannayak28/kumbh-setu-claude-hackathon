import { EvidenceFrameCard } from "@/components/localization/EvidenceFrameCard";
import type { EvidenceFrame } from "@/types/localization";

export function EvidenceFrameStrip({ frames }: { frames: EvidenceFrame[] }) {
  const selected = frames
    .filter((frame) => frame.selected_for_vlm || frame.ocr_text.length > 0)
    .slice(0, 36);

  return (
    <section className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text)]">Evidence frames</h2>
      {selected.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {selected.map((frame) => (
            <EvidenceFrameCard frame={frame} key={frame.frame_id} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[color:var(--muted)]">No high-signal context frames were selected.</p>
      )}
    </section>
  );
}


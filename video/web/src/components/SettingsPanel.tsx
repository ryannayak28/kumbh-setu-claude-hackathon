import { Settings2 } from "lucide-react";

export interface SearchSettings {
  sample_fps: number;
  max_people_per_frame: number;
  min_person_height: number;
  yolo_conf: number;
}

interface SettingsPanelProps {
  settings: SearchSettings;
  onChange: (settings: SearchSettings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  function update<K extends keyof SearchSettings>(key: K, value: SearchSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <details className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-subtle)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[color:var(--text)]">
        <span className="flex items-center gap-2">
          <Settings2 aria-hidden="true" className="h-4 w-4 text-[color:var(--accent)]" />
          Advanced settings
        </span>
        <span className="text-xs font-medium text-[color:var(--muted)]">Defaults work for most demos</span>
      </summary>
      <div className="grid gap-4 border-t border-[color:var(--line)] p-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[color:var(--text)]">Sample FPS</span>
          <input
            className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--text)]"
            min={0.1}
            max={5}
            step={0.1}
            type="number"
            value={settings.sample_fps}
            onChange={(event) => update("sample_fps", Number(event.target.value))}
          />
          <span className="text-xs leading-5 text-[color:var(--muted)]">Higher values increase processing time and VLM cost.</span>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[color:var(--text)]">Max people per frame</span>
          <input
            className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--text)]"
            min={1}
            max={30}
            step={1}
            type="number"
            value={settings.max_people_per_frame}
            onChange={(event) => update("max_people_per_frame", Number(event.target.value))}
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[color:var(--text)]">Min person height</span>
          <input
            className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--text)]"
            min={20}
            max={400}
            step={5}
            type="number"
            value={settings.min_person_height}
            onChange={(event) => update("min_person_height", Number(event.target.value))}
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[color:var(--text)]">YOLO confidence</span>
          <input
            className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--text)]"
            min={0.05}
            max={0.9}
            step={0.05}
            type="number"
            value={settings.yolo_conf}
            onChange={(event) => update("yolo_conf", Number(event.target.value))}
          />
        </label>
      </div>
    </details>
  );
}


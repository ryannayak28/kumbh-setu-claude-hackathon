import { AlertTriangle } from "lucide-react";

export function ErrorBox({ title = "Processing failed", message }: { title?: string; message: string }) {
  return (
    <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-950 dark:border-rose-900/80 dark:bg-rose-950/30 dark:text-rose-100">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-none" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}


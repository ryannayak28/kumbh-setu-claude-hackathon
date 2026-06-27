import { UploadForm } from "@/components/UploadForm";

export default function Home() {
  return (
    <main className="min-h-[100dvh] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <section className="pt-4 lg:sticky lg:top-8">
          <p className="mb-4 text-sm font-semibold text-[color:var(--accent-strong)]">
            Lost Person POV Search
          </p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-normal text-[color:var(--text)] sm:text-5xl">
            Find candidate sightings in POV footage
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[color:var(--muted)]">
            Upload a short event video and describe visible appearance. The app returns likely sightings, timestamps, and clips for human review.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-[color:var(--muted)]">
            <div className="border-l-2 border-[color:var(--accent)] pl-4">
              Candidate sightings only. No face recognition or identity verification.
            </div>
            <div className="border-l-2 border-[color:var(--line)] pl-4">
              Local processing extracts person crops before cloud or mock crop scoring.
            </div>
          </div>
        </section>
        <UploadForm />
      </div>
    </main>
  );
}


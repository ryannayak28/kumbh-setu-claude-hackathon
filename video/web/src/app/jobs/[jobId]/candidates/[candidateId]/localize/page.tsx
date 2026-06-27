import { LocalizationPage } from "@/components/localization/LocalizationPage";

export default async function CandidateLocalizationRoute({
  params,
}: {
  params: Promise<{ jobId: string; candidateId: string }>;
}) {
  const { jobId, candidateId } = await params;
  return <LocalizationPage candidateId={decodeURIComponent(candidateId)} jobId={jobId} />;
}


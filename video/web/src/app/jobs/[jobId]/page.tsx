import { JobClient } from "@/components/JobClient";

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <JobClient jobId={jobId} />;
}


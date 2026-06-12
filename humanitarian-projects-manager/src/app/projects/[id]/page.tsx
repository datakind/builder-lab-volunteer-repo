import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/ProjectDetailClient";
import { getProjectById } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) notFound();
  return <ProjectDetailClient project={project} />;
}

import type { Project } from "@/lib/types";
import { extractReportingScheduleFromDocuments } from "./ai";
import { getProjectById } from "./db";
import { replaceUnstartedProjectSchedule } from "./repository";

type ScheduleCandidateFile = {
  name: string;
  mimeType: string;
  absolutePath: string;
};

export async function detectAndApplyReportingSchedule(input: {
  projectId: string;
  files: ScheduleCandidateFile[];
}) {
  const project = getProjectById(input.projectId);
  if (!project) return { updatedCount: 0, error: "Project not found." };

  const files = input.files.filter((file) => isScheduleCandidate(file, project)).slice(0, 3);
  if (!files.length) return { updatedCount: 0, error: "" };

  try {
    const extraction = await extractReportingScheduleFromDocuments({
      project,
      files: files.map((file) => ({
        filePath: file.absolutePath,
        mimeType: file.mimeType,
        fileName: file.name,
      })),
      templates: project.templates,
    });
    const updatedCount = replaceUnstartedProjectSchedule(project.id, extraction);
    return { updatedCount, error: "" };
  } catch (error) {
    console.error("[schedule] reporting schedule extraction failed", error);
    return {
      updatedCount: 0,
      error: error instanceof Error ? error.message : "Reporting schedule extraction failed.",
    };
  }
}

function isScheduleCandidate(file: ScheduleCandidateFile, project: Project) {
  const text = `${file.name} ${file.mimeType} ${project.funder}`.toLowerCase();
  return /docx|doc|word|proposal|grant|agreement|investment|reporting|schedule|template|amendment/.test(text);
}

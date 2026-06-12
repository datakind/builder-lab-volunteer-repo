import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { slugify } from "@/lib/format";
import type { GeneratedReport, Project } from "@/lib/types";
import { generatedRoot, relativeStoragePath } from "./storage";

export async function writeGeneratedReportDocx(report: GeneratedReport, project: Project) {
  const projectFolder = path.join(generatedRoot, project.id);
  await mkdir(projectFolder, { recursive: true });
  const fileName = `${project.code}_${slugify(project.title)}_${slugify(report.title)}.docx`;
  const filePath = path.join(projectFolder, fileName);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: report.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.LEFT,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${project.code} | ${project.title} | ${project.funder}`, bold: true }),
              new TextRun({ text: `\nGenerated ${report.generatedAt}` }),
            ],
          }),
          metadataTable([
            ["Project", `${project.code} - ${project.title}`],
            ["Funder", project.funder],
            ["Countries", project.countries.join(", ")],
            ["Sector", project.sector],
            ["Budget", `${project.currency} ${project.budget.toLocaleString()}`],
            ["Status", report.status],
          ]),
          new Paragraph({
            text: "Evidence Summary",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph(report.evidenceSummary),
          new Paragraph({
            text: "Missing Evidence Flags",
            heading: HeadingLevel.HEADING_1,
          }),
          ...(report.missingFields.length
            ? report.missingFields.map((field) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: "[REQUIRES HUMAN UPDATE] ", bold: true, color: "8A4B00" }),
                    new TextRun(field),
                  ],
                  bullet: { level: 0 },
                }),
              )
            : [new Paragraph("No missing evidence flags were recorded for this draft.")]),
          ...report.sections.flatMap((section) => [
            new Paragraph({
              text: section.heading,
              heading: HeadingLevel.HEADING_1,
            }),
            ...(section.missingEvidence
              ? [
                  new Paragraph({
                    children: [new TextRun({ text: "[REQUIRES HUMAN UPDATE] Evidence is missing or uncertain for this section.", bold: true, color: "8A4B00" })],
                  }),
                ]
              : []),
            new Paragraph(section.body),
            new Paragraph({
              children: [
                new TextRun({ text: "Evidence: ", bold: true }),
                new TextRun(section.evidence.length ? section.evidence.join("; ") : "No source evidence attached."),
              ],
            }),
          ]),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  await writeFile(filePath, buffer);

  return {
    filePath: relativeStoragePath(filePath),
    fileName,
  };
}

function metadataTable(rows: Array<[string, string]>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
    },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: "334155" })] })],
            }),
            new TableCell({
              width: { size: 72, type: WidthType.PERCENTAGE },
              children: [new Paragraph(value)],
            }),
          ],
        }),
    ),
  });
}

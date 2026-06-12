import { slugify } from "./format";
import type { BudgetSplit, CountryDetail, ProjectRisk, ProjectStatus, ReportingTemplate } from "./types";

type SeedProject = {
  id: string;
  code: string;
  title: string;
  location: CountryDetail;
  sector: string;
  funder: string;
  budget: number;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  manager: string;
  beneficiaries: string;
  sourceDocument: string;
  sourceSummary: string;
};

const commonComponents = [
  "Crisis-affected household assessment and verification",
  "Direct service delivery with community engagement",
  "Local stakeholder training and capacity strengthening",
  "Monitoring, accountability, learning, and quarterly review",
];

const commonDeliverables = [
  "Inception Report",
  "Monthly Situation Reports",
  "Quarterly Progress Reports",
  "GIS Map Package",
  "Midterm Review",
  "Final Narrative Report",
  "Final Financial Report",
  "Lessons Learned Report",
];

const commonRisks: ProjectRisk[] = [
  {
    label: "Access interruptions",
    rating: "High",
    mitigation: "Pre-position supplies, coordinate with local authorities, and keep remote monitoring ready.",
  },
  {
    label: "Community targeting disputes",
    rating: "Medium",
    mitigation: "Publish selection criteria, run community validation, and document complaint responses.",
  },
  {
    label: "Delayed procurement",
    rating: "Medium",
    mitigation: "Maintain secondary vendors and approve early procurement for critical items.",
  },
];

function budgetSplit(total: number): BudgetSplit[] {
  return [
    { label: "Personnel", percentage: 30, amount: Math.round(total * 0.3) },
    { label: "Program costs", percentage: 50, amount: Math.round(total * 0.5) },
    { label: "Operations", percentage: 10, amount: Math.round(total * 0.1) },
    { label: "M&E", percentage: 5, amount: Math.round(total * 0.05) },
    { label: "Indirect", percentage: 5, amount: Math.round(total * 0.05) },
  ];
}

const portfolioSource = "Humanitarian_Project_Proposal_Portfolio.docx";

const projects: SeedProject[] = [
  {
    id: "clean-water-for-recovery",
    code: "ADPC-P011",
    title: "Clean Water for Recovery",
    location: { name: "Northern Mozambique", lat: -12.3335, lng: 39.3206, region: "Cabo Delgado" },
    sector: "WASH",
    funder: "ECHO",
    budget: 1_250_000,
    status: "implementation",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    manager: "Maria Fernandes",
    beneficiaries: "Approximately 87,000 direct beneficiaries in conflict-affected and host communities",
    sourceDocument: "Humanitarian_Project_Proposal_Portfolio.docx; Proposal1_Realistic_Project_Archive.pdf",
    sourceSummary:
      "Portfolio proposal plus realistic archive describe water point rehabilitation, hygiene promotion, water quality testing, community committees, and ECHO monitoring.",
  },
  {
    id: "health-access-on-wheels",
    code: "ADPC-P012",
    title: "Health Access on Wheels",
    location: { name: "South Sudan", lat: 6.877, lng: 31.307, region: "National mobile clinics" },
    sector: "Health",
    funder: "USAID/BHA",
    budget: 2_800_000,
    status: "pipeline",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    manager: "Grace Lado",
    beneficiaries: "Direct: 25,000-150,000 people; Indirect: 40,000-250,000 people",
    sourceDocument: portfolioSource,
    sourceSummary: "Portfolio proposal identifies mobile health assistance in South Sudan with monthly and quarterly deliverables.",
  },
  {
    id: "safe-roof-initiative",
    code: "ADPC-P013",
    title: "Safe Roof Initiative",
    location: { name: "Madagascar", lat: -18.7669, lng: 46.8691, region: "Cyclone-affected districts" },
    sector: "Shelter",
    funder: "IFRC Emergency Appeal",
    budget: 950_000,
    status: "inception",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    manager: "Jean Rakoto",
    beneficiaries: "Direct: 25,000-150,000 people; Indirect: 40,000-250,000 people",
    sourceDocument: portfolioSource,
    sourceSummary: "Portfolio proposal frames shelter recovery activities in Madagascar with exit planning and final reports.",
  },
  {
    id: "dignity-through-cash",
    code: "ADPC-P014",
    title: "Dignity Through Cash",
    location: { name: "Somalia", lat: 5.1521, lng: 46.1996, region: "Banadir, Lower Shabelle, Bay, and Mudug" },
    sector: "Cash Assistance",
    funder: "FCDO",
    budget: 4_200_000,
    status: "implementation",
    startDate: "2026-10-01",
    endDate: "2027-09-30",
    manager: "Hassan Noor",
    beneficiaries: "Targeted crisis-affected households receiving multipurpose cash assistance",
    sourceDocument: "Humanitarian_Project_Proposal_Portfolio.docx; Dignity_Through_Cash_Reports.pdf",
    sourceSummary:
      "Portfolio proposal and reporting package describe MPCA delivery, mobile money providers, community committees, PDM, market monitoring, and FCDO reporting.",
  },
  {
    id: "stop-cholera-now",
    code: "ADPC-P015",
    title: "Stop Cholera Now",
    location: { name: "DRC", lat: -2.8799, lng: 23.656, region: "Cholera hotspot provinces" },
    sector: "Health & WASH",
    funder: "UNICEF",
    budget: 1_800_000,
    status: "pipeline",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    manager: "Aline Kabila",
    beneficiaries: "Direct: 25,000-150,000 people; Indirect: 40,000-250,000 people",
    sourceDocument: portfolioSource,
    sourceSummary: "Portfolio proposal combines health and WASH activities for cholera response in DRC.",
  },
  {
    id: "learning-without-interruption",
    code: "ADPC-P016",
    title: "Learning Without Interruption",
    location: { name: "Syria", lat: 34.8021, lng: 38.9968, region: "Conflict-affected governorates" },
    sector: "Education",
    funder: "Education Cannot Wait",
    budget: 3_100_000,
    status: "concept",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    manager: "Rana Haddad",
    beneficiaries: "Direct: 25,000-150,000 people; Indirect: 40,000-250,000 people",
    sourceDocument: portfolioSource,
    sourceSummary: "Portfolio proposal supports education continuity for crisis-affected children in Syria.",
  },
  {
    id: "nourish-and-thrive",
    code: "ADPC-P017",
    title: "Nourish and Thrive",
    location: { name: "Ethiopia", lat: 9.145, lng: 40.4897, region: "Food-insecure districts" },
    sector: "Nutrition",
    funder: "WFP",
    budget: 2_450_000,
    status: "implementation",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    manager: "Mekdes Tadesse",
    beneficiaries: "Direct: 25,000-150,000 people; Indirect: 40,000-250,000 people",
    sourceDocument: portfolioSource,
    sourceSummary: "Portfolio proposal focuses on nutrition support in Ethiopia with monthly monitoring.",
  },
  {
    id: "protection-first",
    code: "ADPC-P018",
    title: "Protection First",
    location: { name: "Uganda", lat: 1.3733, lng: 32.2903, region: "Refugee-hosting districts" },
    sector: "Protection",
    funder: "UNHCR",
    budget: 1_650_000,
    status: "inception",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    manager: "Sarah Nakato",
    beneficiaries: "Direct: 25,000-150,000 people; Indirect: 40,000-250,000 people",
    sourceDocument: portfolioSource,
    sourceSummary: "Portfolio proposal describes protection assistance and community accountability in Uganda.",
  },
  {
    id: "rapid-response-logistics-hub",
    code: "ADPC-P019",
    title: "Rapid Response Logistics Hub",
    location: { name: "Bangladesh", lat: 23.685, lng: 90.3563, region: "Crisis logistics corridors" },
    sector: "Logistics",
    funder: "CERF",
    budget: 5_600_000,
    status: "pipeline",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    manager: "Nasima Karim",
    beneficiaries: "Direct: 25,000-150,000 people; Indirect: 40,000-250,000 people",
    sourceDocument: portfolioSource,
    sourceSummary: "Portfolio proposal establishes rapid response logistics capacity in Bangladesh.",
  },
  {
    id: "resilient-communities-initiative",
    code: "ADPC-P020",
    title: "Resilient Communities Initiative",
    location: { name: "Nepal", lat: 28.3949, lng: 84.124, region: "Mountain and riverine communities" },
    sector: "DRR",
    funder: "Green Climate Fund",
    budget: 6_750_000,
    status: "concept",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    manager: "Pema Gurung",
    beneficiaries: "Direct: 25,000-150,000 people; Indirect: 40,000-250,000 people",
    sourceDocument: portfolioSource,
    sourceSummary: "Portfolio proposal outlines DRR and climate resilience activities in Nepal.",
  },
];

export const seedProjects = projects.map((project) => ({
  ...project,
  concept: `${project.title} addresses urgent humanitarian needs in ${project.location.name} through direct delivery, community engagement, capacity strengthening, and monitoring.`,
  countries: [project.location.name],
  countryDetails: [project.location],
  durationMonths: 12,
  currency: "USD" as const,
  objective: "Reduce humanitarian suffering and improve recovery outcomes.",
  components:
    project.id === "dignity-through-cash"
      ? [
          "Multipurpose cash assistance registration and delivery",
          "Mobile money provider coordination and reconciliation",
          "Market monitoring and post-distribution monitoring",
          "Protection mainstreaming, complaints, feedback, and adaptation",
        ]
      : project.id === "clean-water-for-recovery"
        ? [
            "Water point assessment and technical rehabilitation",
            "Water quality testing and temporary chlorination",
            "Hygiene promotion and household treatment support",
            "Community Water Committee training and maintenance planning",
          ]
        : commonComponents,
  deliverables: commonDeliverables,
  risks:
    project.id === "clean-water-for-recovery"
      ? [
          {
            label: "Early onset rainy season disrupting access",
            rating: "High" as const,
            mitigation: "Pre-position materials and increase local warehousing.",
          },
          {
            label: "Pump component shortages",
            rating: "Medium" as const,
            mitigation: "Use secondary suppliers in Pemba and Nampula.",
          },
          {
            label: "Government capacity constraints after project closure",
            rating: "High" as const,
            mitigation: "Expand mechanic refresher training and district-level maintenance support.",
          },
        ]
      : project.id === "dignity-through-cash"
        ? [
            {
              label: "Insecurity restricting field movement",
              rating: "High" as const,
              mitigation: "Use remote monitoring, community focal points, and security-cleared movement windows.",
            },
            {
              label: "Mobile money interruptions",
              rating: "Medium" as const,
              mitigation: "Coordinate with financial providers and maintain verification contingencies.",
            },
            {
              label: "Inflation reducing transfer value",
              rating: "Medium" as const,
              mitigation: "Track market prices and raise transfer value concerns through Cash Working Group forums.",
            },
          ]
        : commonRisks,
  budgetSplit: budgetSplit(project.budget),
}));

export const seedTemplates: ReportingTemplate[] = [
  {
    id: "tpl-monthly-sitrep",
    projectId: null,
    name: "Monthly Situation Report",
    funder: "All funders",
    cadence: "Monthly",
    reportType: "Monthly Situation Report",
    requiredSections: [
      "Project Information",
      "Context Update",
      "Activities Conducted",
      "Beneficiaries Reached",
      "Challenges and Mitigation",
      "Planned Activities Next Month",
      "Attachments",
    ],
    metadataFields: [
      "Project ID",
      "Donor",
      "Country",
      "Sector",
      "Reporting Period",
      "Budget",
      "Beneficiaries Targeted",
      "Beneficiaries Reached",
    ],
    sourceDocument: "Humanitarian_Donor_Reporting_Templates.docx",
    filePath: null,
    uploadedAt: "2026-06-11T00:00:00.000Z",
    isDefault: true,
  },
  {
    id: "tpl-quarterly-progress",
    projectId: null,
    name: "Quarterly Donor Progress Report",
    funder: "All funders",
    cadence: "Quarterly",
    reportType: "Quarterly Donor Progress Report",
    requiredSections: [
      "Executive Summary",
      "Progress Against Objectives",
      "Major Accomplishments",
      "Beneficiary Reach",
      "Budget Burn Rate",
      "Risks",
      "Lessons Learned",
    ],
    metadataFields: ["Project ID", "Donor", "Country", "Sector", "Reporting Period", "Budget"],
    sourceDocument: "Humanitarian_Donor_Reporting_Templates.docx",
    filePath: null,
    uploadedAt: "2026-06-11T00:00:00.000Z",
    isDefault: true,
  },
  {
    id: "tpl-fcdo-cash",
    projectId: null,
    name: "FCDO Cash Assistance Progress Report",
    funder: "FCDO",
    cadence: "Quarterly",
    reportType: "Quarterly Donor Progress Report",
    requiredSections: [
      "Delivery summary",
      "Transfer reconciliation",
      "Market monitoring",
      "Protection mainstreaming",
      "Complaints and feedback",
      "Adaptations",
    ],
    metadataFields: ["Project ID", "Funder", "Transfer cycle", "Households reached", "Amount disbursed"],
    sourceDocument: "Humanitarian_Donor_Reporting_Templates.docx",
    filePath: null,
    uploadedAt: "2026-06-11T00:00:00.000Z",
    isDefault: true,
  },
  {
    id: "tpl-echo-interim",
    projectId: null,
    name: "ECHO Interim Narrative Report",
    funder: "ECHO",
    cadence: "Quarterly",
    reportType: "Quarterly Donor Progress Report",
    requiredSections: [
      "Action overview",
      "Implementation progress",
      "Beneficiaries reached",
      "Sector results",
      "Risks and constraints",
      "Financial overview",
      "Lessons and next steps",
    ],
    metadataFields: ["Action number", "Partner", "Location", "Reporting period", "Budget"],
    sourceDocument: "Humanitarian_Donor_Reporting_Templates.docx; Proposal1_Realistic_Project_Archive.pdf",
    filePath: null,
    uploadedAt: "2026-06-11T00:00:00.000Z",
    isDefault: true,
  },
  {
    id: "tpl-unicef-quarterly",
    projectId: null,
    name: "UNICEF Quarterly Programme Report",
    funder: "UNICEF",
    cadence: "Quarterly",
    reportType: "Quarterly Donor Progress Report",
    requiredSections: ["Programme overview", "Results matrix", "Output-level progress", "Challenges", "Annexes"],
    metadataFields: ["Project ID", "Country", "Sector", "Reporting period"],
    sourceDocument: "Humanitarian_Donor_Reporting_Templates.docx",
    filePath: null,
    uploadedAt: "2026-06-11T00:00:00.000Z",
    isDefault: true,
  },
  {
    id: "tpl-final-closeout",
    projectId: null,
    name: "Final Project Closeout Report",
    funder: "All funders",
    cadence: "Final",
    reportType: "Final Project Closeout Report",
    requiredSections: [
      "Project Summary",
      "Achievement of Objectives",
      "Final Indicator Table",
      "Sustainability Measures",
      "Exit Strategy",
      "Assets Handover",
      "Lessons Learned",
    ],
    metadataFields: ["Project ID", "Donor", "Country", "Sector", "Budget", "Final reporting period"],
    sourceDocument: "Humanitarian_Donor_Reporting_Templates.docx",
    filePath: null,
    uploadedAt: "2026-06-11T00:00:00.000Z",
    isDefault: true,
  },
];

export function seedScheduleForProject(projectId: string, endDate: string) {
  return [
    {
      id: `${projectId}-monthly-1`,
      projectId,
      reportType: "Monthly Situation Report",
      dueDate: "2026-08-31",
      templateId: "tpl-monthly-sitrep",
    },
    {
      id: `${projectId}-quarterly-1`,
      projectId,
      reportType: "Quarterly Donor Progress Report",
      dueDate: "2026-09-30",
      templateId: projectId === "dignity-through-cash" ? "tpl-fcdo-cash" : projectId === "clean-water-for-recovery" ? "tpl-echo-interim" : "tpl-quarterly-progress",
    },
    {
      id: `${projectId}-closeout-1`,
      projectId,
      reportType: "Final Project Closeout Report",
      dueDate: endDate,
      templateId: "tpl-final-closeout",
    },
  ];
}

export function templateSlug(template: ReportingTemplate) {
  return `${slugify(template.funder)}-${slugify(template.name)}`;
}

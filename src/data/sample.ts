import rawCustomers from "./customers.json";

export type ICPTier = "A" | "B" | "C";
export type ExpansionType =
  | "Digital"
  | "Operational"
  | "Strategic"
  | "Replication"
  | "User"
  | "Hardware";
export type ExpansionMotion =
  | "Online Only"
  | "Discovery Call"
  | "Consultative"
  | "Site Survey"
  | "Enterprise Rollout";
export type OpportunityStatus =
  | "Identified"
  | "Qualified"
  | "Discovery Scheduled"
  | "Discussion Ongoing"
  | "Proposal Shared"
  | "PO Expected"
  | "Won"
  | "Lost";

export interface Customer {
  id: string;
  name: string;
  key: string;
  cluster: string;
  state: string;
  icpTier: ICPTier;
  turnover: number;
  turnoverText: string;
  castingType: string;
  units: number;
  unitDetails: string;
  adoption: number;
  customerAge: number;
  noModules: number;
  adoptionPoc: string;
  salesPoc: string;
  currentSystems: string[];
  hardwareInstalled: string[];
  userLite: number;
  userPro: number;
  /** Final Pitch (editable). Kept under legacy name for backwards compat. */
  nextBestPitch: string;
  suggestedOpportunities: string[];
  expansionPath: string[];
  expansionType: ExpansionType;
  expansionMotion: ExpansionMotion;
  siteSurveyRequired: boolean;
  multiUnitOpportunity: boolean;
  upsellValue: number;
  confidence: number;
  owner: string;
  status: OpportunityStatus;
  nextStep: string;
  notes: string;
  /** ISO timestamp of the last opportunity-status change (used for sectioning). */
  statusChangedAt?: string;
}

// Map any legacy status strings that may appear in stored data / JSON.
const STATUS_MAP: Record<string, OpportunityStatus> = {
  Identified: "Identified",
  Qualified: "Qualified",
  Discovery: "Discovery Scheduled",
  "Discovery Scheduled": "Discovery Scheduled",
  Discussion: "Discussion Ongoing",
  "Discussion Ongoing": "Discussion Ongoing",
  Proposal: "Proposal Shared",
  "Proposal Shared": "Proposal Shared",
  "PO Expected": "PO Expected",
  Won: "Won",
  Lost: "Lost",
};

export const expansionTypes: ExpansionType[] = [
  "Digital",
  "Operational",
  "Strategic",
  "Replication",
  "User",
  "Hardware",
];
export const expansionMotions: ExpansionMotion[] = [
  "Online Only",
  "Discovery Call",
  "Consultative",
  "Site Survey",
  "Enterprise Rollout",
];
export const statuses: OpportunityStatus[] = [
  "Identified",
  "Qualified",
  "Discovery Scheduled",
  "Discussion Ongoing",
  "Proposal Shared",
  "PO Expected",
  "Won",
  "Lost",
];

// MetalCloud module catalogue
export const allSystems = [
  "Spectro",
  "Power",
  "Pyro",
  "Standard MTC",
  "AI Module",
  "DLMS",
  "Blueprint MTC",
  "Heat Plan",
  "EAF",
  "Custom Projects",
];

const normalize = (raw: any): Customer => {
  const finalPitch: string =
    raw.finalPitch ??
    raw.nextBestPitch ??
    (Array.isArray(raw.suggestedOpportunities) && raw.suggestedOpportunities.length
      ? raw.suggestedOpportunities.slice(0, 2).join(" + ")
      : "");
  return {
    id: raw.id,
    name: raw.name ?? "",
    key: raw.key ?? "",
    cluster: raw.cluster ?? "",
    state: raw.state ?? "",
    icpTier: (raw.icpTier ?? "B") as ICPTier,
    turnover: Number(raw.turnover ?? 0),
    turnoverText: raw.turnoverText ?? "",
    castingType: raw.castingType ?? "",
    units: Number(raw.units ?? 1),
    unitDetails: raw.unitDetails ?? "",
    adoption: Number(raw.adoption ?? 0),
    customerAge: Number(raw.customerAge ?? 0),
    noModules: Number(raw.noModules ?? 0),
    adoptionPoc: raw.adoptionPoc ?? "",
    salesPoc: raw.salesPoc ?? "",
    currentSystems: raw.currentSystems ?? [],
    hardwareInstalled: raw.hardwareInstalled ?? [],
    userLite: Number(raw.userLite ?? 0),
    userPro: Number(raw.userPro ?? 0),
    nextBestPitch: finalPitch,
    suggestedOpportunities: raw.suggestedOpportunities ?? [],
    expansionPath: raw.expansionPath ?? [],
    expansionType: (raw.expansionType ?? "Operational") as ExpansionType,
    expansionMotion: (raw.expansionMotion ?? "Discovery Call") as ExpansionMotion,
    siteSurveyRequired: Boolean(raw.siteSurveyRequired),
    multiUnitOpportunity: Boolean(raw.multiUnitOpportunity),
    upsellValue: Number(raw.upsellValue ?? 0),
    confidence: Number(raw.confidence ?? 0),
    owner: raw.owner ?? "",
    status: (STATUS_MAP[raw.status] ?? "Identified") as OpportunityStatus,
    nextStep: raw.nextStep ?? "",
    notes: raw.notes ?? "",
    statusChangedAt: raw.statusChangedAt ?? undefined,
  };
};

export const sampleCustomers: Customer[] = (rawCustomers as any[]).map(normalize);

export const allOwners = Array.from(
  new Set(sampleCustomers.map((c) => c.salesPoc).filter(Boolean))
).sort();
export const allClusters = Array.from(
  new Set(sampleCustomers.map((c) => c.cluster).filter(Boolean))
).sort();
export const allStates = Array.from(
  new Set(sampleCustomers.map((c) => c.state).filter(Boolean))
).sort();
export const allCastings = Array.from(
  new Set(sampleCustomers.map((c) => c.castingType).filter(Boolean))
).sort();

/** Re-normalize an arbitrary record (e.g. from localStorage) into a valid Customer. */
export const normalizeCustomer = normalize;

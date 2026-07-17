import type { ISODateString, ISODateTimeString } from "./clinical-record";

export type FhirResourceType =
  | "Bundle"
  | "Patient"
  | "Encounter"
  | "Condition"
  | "AllergyIntolerance"
  | "MedicationStatement"
  | "Observation"
  | "DiagnosticReport"
  | "Specimen";

export interface FhirIdentifier {
  system?: string;
  value: string;
}

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirReference {
  reference: string;
  display?: string;
}

export interface FhirMeta {
  profile?: string[];
  lastUpdated?: ISODateTimeString;
}

export interface FhirResourceBase {
  resourceType: FhirResourceType;
  id?: string;
  meta?: FhirMeta;
}

export interface FhirPatient extends FhirResourceBase {
  resourceType: "Patient";
  identifier?: FhirIdentifier[];
  name?: Array<{ text: string }>;
  gender?: "female" | "male" | "other" | "unknown";
  birthDate?: ISODateString;
}

export interface FhirEncounter extends FhirResourceBase {
  resourceType: "Encounter";
  status: "planned" | "arrived" | "triaged" | "in-progress" | "onleave" | "finished" | "cancelled" | "unknown";
  subject: FhirReference;
  period?: { start?: ISODateTimeString; end?: ISODateTimeString };
  serviceProvider?: FhirReference;
}

export interface FhirCondition extends FhirResourceBase {
  resourceType: "Condition";
  subject: FhirReference;
  encounter?: FhirReference;
  code?: FhirCodeableConcept;
  clinicalStatus?: FhirCodeableConcept;
  onsetDateTime?: ISODateTimeString;
  note?: Array<{ text: string }>;
}

export interface FhirAllergyIntolerance extends FhirResourceBase {
  resourceType: "AllergyIntolerance";
  patient: FhirReference;
  code?: FhirCodeableConcept;
  clinicalStatus?: FhirCodeableConcept;
  reaction?: Array<{ manifestation: FhirCodeableConcept[]; description?: string }>;
  note?: Array<{ text: string }>;
}

export interface FhirMedicationStatement extends FhirResourceBase {
  resourceType: "MedicationStatement";
  status: "active" | "completed" | "entered-in-error" | "intended" | "stopped" | "on-hold" | "unknown" | "not-taken";
  subject: FhirReference;
  encounter?: FhirReference;
  medicationCodeableConcept?: FhirCodeableConcept;
  dosage?: Array<{ text?: string; route?: FhirCodeableConcept }>;
  effectivePeriod?: { start?: ISODateTimeString; end?: ISODateTimeString };
  note?: Array<{ text: string }>;
}

export interface FhirObservation extends FhirResourceBase {
  resourceType: "Observation";
  status: "registered" | "preliminary" | "final" | "amended" | "corrected" | "cancelled" | "entered-in-error" | "unknown";
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: ISODateTimeString;
  valueQuantity?: { value: number; unit?: string; system?: string; code?: string };
  valueString?: string;
  interpretation?: FhirCodeableConcept[];
  note?: Array<{ text: string }>;
}

export interface FhirDiagnosticReport extends FhirResourceBase {
  resourceType: "DiagnosticReport";
  status: "registered" | "partial" | "preliminary" | "final" | "amended" | "corrected" | "appended" | "cancelled" | "entered-in-error" | "unknown";
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: ISODateTimeString;
  result?: FhirReference[];
  conclusion?: string;
}

export type FhirResource =
  | FhirPatient
  | FhirEncounter
  | FhirCondition
  | FhirAllergyIntolerance
  | FhirMedicationStatement
  | FhirObservation
  | FhirDiagnosticReport;

export interface FhirBundleEntry {
  fullUrl?: string;
  resource: FhirResource;
}

export interface FhirBundle {
  resourceType: "Bundle";
  type: "document" | "collection";
  timestamp?: ISODateTimeString;
  entry: FhirBundleEntry[];
}

export interface BasicFhirValidationIssue {
  code: string;
  message: string;
  entryIndex?: number;
}

export interface BasicFhirValidationResult {
  valid: boolean;
  issues: BasicFhirValidationIssue[];
}

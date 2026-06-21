export type ISODateString = string;
export type ISODateTimeString = string;
export type ClinicalRecordSchema = "temperaturna-lista-clinical-record-v1";

export type PatientMode = "ambulatory" | "ward";
export type ClinicalRole =
  | "admin"
  | "clinician"
  | "nurse"
  | "viewer"
  | "auditor"
  | "developer";

export type PatientDocumentStatus = "active" | "deleted";

export interface AuthContext {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  organizationId: string | null;
  wardIds: string[];
  activeWardId: string | null;
  roles: ClinicalRole[];
  isAuthenticated: boolean;
  hasValidClinicalContext: boolean;
}

export interface PatientIdentifier {
  system: string;
  value: string;
  label?: string;
}

export interface PatientIdentity {
  fullName: string;
  birthYear?: number;
  sex?: "female" | "male" | "other" | "unknown";
  patientIdentifiers: PatientIdentifier[];
}

export interface Encounter {
  admissionDate?: ISODateString;
  admissionTime?: string;
  source?: string;
  wardId?: string;
  room?: string;
  bed?: string;
  attendingPhysician?: string;
  dayOfHospitalization?: number;
  patientMode?: PatientMode;
}

export type ConditionType = "working" | "confirmed" | "discharge" | "comorbidity";
export type ClinicalStatus = "active" | "inactive" | "resolved" | "unknown";

export interface Condition {
  id: string;
  type: ConditionType;
  text: string;
  codeSystem?: string;
  code?: string;
  onsetDate?: ISODateString;
  status?: ClinicalStatus;
  note?: string;
}

export interface Allergy {
  id: string;
  substance: string;
  reaction?: string;
  severity?: "mild" | "moderate" | "severe" | "unknown";
  certainty?: "confirmed" | "suspected" | "unknown";
  status?: ClinicalStatus;
  note?: string;
}

export interface Medication {
  id: string;
  name: string;
  route?: string;
  dose?: string;
  doseUnit?: string;
  frequency?: string;
  scheduleText?: string;
  startDate?: ISODateString;
  stopDate?: ISODateString;
  indication?: string;
  isAntimicrobial?: boolean;
  renalAdjustmentRequired?: boolean;
  sourceText?: string;
  note?: string;
}

export interface VitalSigns {
  id: string;
  measuredAt?: ISODateTimeString;
  temperatureC?: number;
  systolicBpMmHg?: number;
  diastolicBpMmHg?: number;
  heartRatePerMin?: number;
  respiratoryRatePerMin?: number;
  spo2Percent?: number;
  oxygenTherapy?: string;
  painScore?: number;
  note?: string;
}

export interface LabResult {
  id: string;
  collectedAt?: ISODateTimeString;
  panel?: string;
  analyte: string;
  value?: string | number;
  unit?: string;
  referenceRange?: string;
  abnormalFlag?: "low" | "high" | "critical-low" | "critical-high" | "normal" | "unknown";
  sourceText?: string;
  note?: string;
}

export interface MicrobiologyResult {
  id: string;
  collectedAt?: ISODateTimeString;
  specimen?: string;
  testType?: string;
  organism?: string;
  resultText: string;
  susceptibility?: Record<string, string>;
  finalStatus?: "preliminary" | "final" | "corrected" | "unknown";
  sourceText?: string;
  note?: string;
}

export interface InfectionControl {
  isolationType?: string;
  indication?: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
  note?: string;
}

export interface ClinicalFreeText {
  originalDiagnosisText?: string;
  originalTherapyText?: string;
  originalLabText?: string;
  originalMicrobiologyText?: string;
}

export interface ClinicalRecordMetadata {
  appVersion?: string;
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
  source?: "manual" | "parser" | "firebase" | "import" | "test";
  parserVersion?: string;
}

export interface ClinicalRecordV1 {
  schema: ClinicalRecordSchema;
  patient: PatientIdentity;
  encounter: Encounter;
  conditions: Condition[];
  allergies: Allergy[];
  medications: Medication[];
  vitalSigns: VitalSigns[];
  labs: LabResult[];
  microbiology: MicrobiologyResult[];
  infectionControl: InfectionControl;
  freeText: ClinicalFreeText;
  metadata: ClinicalRecordMetadata;
}

export type ValidationSeverity = "info" | "warning" | "critical" | "error";

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  fieldPath?: string;
  relatedIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export type MedicationSafetyIssueType =
  | "duplicate-medication"
  | "allergy-match"
  | "antimicrobial-missing-indication"
  | "antimicrobial-missing-review-date"
  | "renal-adjustment-warning"
  | "missing-dose"
  | "missing-route";

export interface MedicationSafetyIssue extends ValidationIssue {
  type: MedicationSafetyIssueType;
  medicationId?: string;
}

export interface MedicationSafetyCheckResult {
  summary: string;
  issues: MedicationSafetyIssue[];
}

export type PatientSyncStatus =
  | "empty"
  | "dirty"
  | "saving"
  | "synced"
  | "failed"
  | "offline"
  | "localOnly";

export interface PatientSyncState {
  status: PatientSyncStatus;
  lastSavedAt?: ISODateTimeString;
  lastSaveTarget: "firebase" | "encrypted-local" | "none";
  lastError?: string;
  currentPatientDocId?: string;
  currentPatientVersion?: number;
  hasUnsavedChanges: boolean;
}

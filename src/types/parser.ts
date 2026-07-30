import type { ClinicalRecordV1, ISODateTimeString } from "./clinical-record";

export type ParserProvenanceStatus = "parsed";

export interface ParserFieldProvenance {
  field: string;
  label: string;
  group: "identityAdmission" | "allergyStatus" | "criticalFields";
  critical: boolean;
  sourceExcerpt: string;
  confidence: number;
  valueHash: string;
  status: ParserProvenanceStatus;
}

export interface ParserProvenanceV1 {
  schema: "temperaturna-lista-parser-provenance-v1";
  parserVersion: string;
  parserMode: "department" | "ambulatory" | "";
  source: string;
  parsedAt: ISODateTimeString;
  sourceTextHash: string;
  fields: Record<string, ParserFieldProvenance>;
}

export interface ParserResult {
  schema: "temperaturna-lista-parser-result-v1";
  clinicalRecord: ClinicalRecordV1;
  confidence?: number;
  warnings: string[];
  sourceTextHash?: string;
  parserVersion?: string;
}

export interface ParserSensitiveFinding {
  type:
    | "oib"
    | "mbo"
    | "phone"
    | "email"
    | "address"
    | "full-name-date-of-birth"
    | "hospital-result-number"
    | "free-text-identifier";
  fieldPath?: string;
  matchPreview?: string;
}

export type ParserTestPrivacyStatus = "anonymized" | "synthetic";

export interface ParserTestCaseMetadata {
  privacyStatus: ParserTestPrivacyStatus;
  sanitizedAt: ISODateTimeString;
  sanitizerVersion: string;
  removedSensitiveFieldsCount: number;
  sensitiveFindings?: ParserSensitiveFinding[];
}

export interface ParserTestCase {
  schema: "temperaturna-lista-parser-test-case-v1";
  id: string;
  title?: string;
  createdAt: ISODateTimeString;
  issueDescription: string;
  inputText: string;
  expected?: Partial<ClinicalRecordV1>;
  metadata: ParserTestCaseMetadata;
}

export interface ParserSanitizationResult {
  blocked: boolean;
  testCase: ParserTestCase | null;
  findings: ParserSensitiveFinding[];
  removedSensitiveFieldsCount: number;
}

export interface ParserCaptureRequest {
  rawText: string;
  issueDescription: string;
  createdAt: ISODateTimeString;
  expected?: Partial<ClinicalRecordV1>;
}

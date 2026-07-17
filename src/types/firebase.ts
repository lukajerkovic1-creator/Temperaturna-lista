import type {
  AuthContext,
  ClinicalRecordV1,
  ClinicalRole,
  ISODateTimeString,
  PatientDocumentStatus,
  PatientMode,
} from "./clinical-record";

export interface FirebaseTimestampLike {
  seconds: number;
  nanoseconds: number;
}

export type FirebaseDateValue = ISODateTimeString | FirebaseTimestampLike;

export interface PatientFirebasePayload {
  schema: "temperaturna-lista-patient-v1";
  appVersion?: string;
  patientKey: string;
  organizationId: string;
  wardId: string;
  patientMode: PatientMode;
  status: PatientDocumentStatus;
  ownerUid?: string;
  createdAt?: FirebaseDateValue;
  createdByUid?: string;
  createdByEmail?: string;
  updatedAt?: FirebaseDateValue;
  updatedByUid?: string;
  updatedByEmail?: string;
  version: number;
  dataHash?: string;
  deletedAt?: FirebaseDateValue;
  deletedByUid?: string;
  deletedByEmail?: string;
  deleteReason?: string;
  clinicalRecord: ClinicalRecordV1;
}

export type PatientAuditEventType =
  | "patient.create"
  | "patient.update"
  | "patient.rename"
  | "patient.softDelete"
  | "patient.restore"
  | "patient.open"
  | "patient.print"
  | "patient.printWithoutSync"
  | "patient.saveFailed"
  | "patient.conflictDetected"
  | "patient.conflictMerged"
  | "patient.conflictSavedAsCopy";

export interface PatientAuditEvent {
  schema: "temperaturna-lista-audit-v1";
  eventType: PatientAuditEventType;
  patientDocId?: string;
  patientKey?: string;
  organizationId?: string;
  wardId?: string;
  actorUid?: string;
  actorEmail?: string;
  actorRole?: ClinicalRole;
  appVersion?: string;
  createdAt: FirebaseDateValue;
  source: "client";
  trigger?: string;
  changeSummary?: string;
  changedFields?: string[];
  previousHash?: string;
  newHash?: string;
  metadata?: Record<string, unknown>;
}

export interface PatientConflictSnapshot {
  docId: string;
  version: number;
  updatedAt?: FirebaseDateValue;
  updatedByUid?: string;
  updatedByEmail?: string;
  clinicalRecordHash: string;
}

export interface FirebasePatientAccessContext {
  auth: AuthContext;
  organizationId: string;
  activeWardId: string;
  allowedWardIds: string[];
  canRead: boolean;
  canWrite: boolean;
  canRestoreDeleted: boolean;
}

export interface FirebaseSmokeClientCall {
  collection: string;
  action: "create" | "read" | "update" | "soft-delete" | "restore" | "audit";
  payload?: unknown;
}

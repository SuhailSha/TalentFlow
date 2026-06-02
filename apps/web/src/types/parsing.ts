import type { ResumeParserProvider } from './extraction-config';

export type ParsingJobStatus =
  | 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'SUPERSEDED';

export interface ParsingJobView {
  id:                 string;
  resumeVersionId:    string;
  organizationId:     string;
  provider:           ResumeParserProvider;
  providerVersion:    string | null;
  status:             ParsingJobStatus;
  attempt:            number;
  startedAt:          string | null;
  finishedAt:         string | null;
  durationMs:         number | null;
  errorCode:          string | null;
  errorMessage:       string | null;
  costUsd:            number | null;
  inputTokens:        number | null;
  outputTokens:       number | null;
  extractionResultId: string | null;
  extractionResult?:  {
    id:                string;
    overallConfidence: number;
  } | null;
  createdAt:          string;
  updatedAt:          string;
}

export interface ExtractionResultView {
  id:                string;
  parsingJobId:      string;
  resumeVersionId:   string;
  organizationId:    string;
  schemaVersion:     number;
  payload:           unknown;            // ExtractionPayload — typed below
  confidence:        Record<string, number>;
  overallConfidence: number;
  rawText:           string | null;
  parserMetadata:    Record<string, unknown>;
  createdAt:         string;
}

export const PARSING_STATUS_LABELS: Record<ParsingJobStatus, string> = {
  QUEUED:     'Queued',
  RUNNING:    'Running',
  SUCCEEDED:  'Succeeded',
  FAILED:     'Failed',
  CANCELLED:  'Cancelled',
  SUPERSEDED: 'Superseded',
};

import { Injectable } from '@nestjs/common';

import { ParsingError } from '../parsers/parser-errors';

export interface TextExtractionResult {
  rawText:   string;
  pageCount?: number;
}

const PDF_MIME    = 'application/pdf';
const DOCX_MIME   = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME    = 'application/msword';
const TXT_MIME    = 'text/plain';
const RTF_MIME    = 'application/rtf';

/**
 * Stage 2 — MIME-aware text extraction.
 *
 * Supported formats:
 *   - PDF        via pdf-parse
 *   - DOCX       via mammoth
 *   - DOC (.doc) → unsupported in R2 (OCR / antiword integration is R6)
 *   - TXT        plain UTF-8 decode
 *   - RTF        strip control words ({\rtf, \...) — adequate for resumes
 *
 * On unsupported formats or extraction failure: throws ParsingError with
 * code='permanent' so the orchestrator fails the job without retry.
 */
@Injectable()
export class TextExtractionService {
  async extract(bytes: Buffer, mimeType: string): Promise<TextExtractionResult> {
    switch (mimeType) {
      case PDF_MIME:  return this.extractPdf(bytes);
      case DOCX_MIME: return this.extractDocx(bytes);
      case TXT_MIME:  return { rawText: bytes.toString('utf8') };
      case RTF_MIME:  return { rawText: this.extractRtf(bytes) };
      case DOC_MIME:
        throw new ParsingError(
          'permanent',
          'Legacy .doc files are not supported in R2. Re-save as .docx or .pdf.',
        );
      default:
        throw new ParsingError('permanent', `Unsupported MIME type: ${mimeType}`);
    }
  }

  private async extractPdf(bytes: Buffer): Promise<TextExtractionResult> {
    // pdf-parse is CJS-only; require keeps types/imports happy under tsc strict.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string; numpages: number }>;
    try {
      const result = await pdfParse(bytes);
      return { rawText: (result.text ?? '').trim(), pageCount: result.numpages };
    } catch (e: unknown) {
      throw new ParsingError('permanent', `PDF parse failed: ${(e as Error).message}`, e);
    }
  }

  private async extractDocx(bytes: Buffer): Promise<TextExtractionResult> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as { extractRawText: (i: { buffer: Buffer }) => Promise<{ value: string }> };
    try {
      const result = await mammoth.extractRawText({ buffer: bytes });
      return { rawText: (result.value ?? '').trim() };
    } catch (e: unknown) {
      throw new ParsingError('permanent', `DOCX parse failed: ${(e as Error).message}`, e);
    }
  }

  private extractRtf(bytes: Buffer): string {
    // Strip RTF control words and braces. Sufficient for plain-text content;
    // tables / formatted lists are best-effort.
    return bytes
      .toString('utf8')
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\'[0-9a-fA-F]{2}/g, '')
      .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
      .replace(/[{}]/g, '')
      .replace(/\r\n?/g, '\n')
      .trim();
  }
}

import { Injectable, Logger } from '@nestjs/common';

import type { ExtractionPayload } from '../types/extraction-payload';

/**
 * Stage 5 — PayloadStripper.
 *
 * The mandatory enforcement point for OrganizationExtractionConfig.extractFields.
 *
 * No code path bypasses this stage. Even if Gemini volunteers fields that the
 * org has disabled, they are dropped here before persistence — the contract
 * is that ExtractionResult.payload contains ONLY fields the org has consented
 * to extract.
 *
 * Custom fields are also filtered: only IDs declared in the org's customFields
 * config are retained.
 *
 * Stripper records the list of dropped fields in `stripped`, which the
 * orchestrator persists to parserMetadata for audit.
 */
@Injectable()
export class PayloadStripperService {
  private readonly logger = new Logger(PayloadStripperService.name);

  strip(
    payload: ExtractionPayload,
    extractFields:  Record<string, Record<string, boolean>>,
    customFieldIds: Set<string>,
  ): { payload: ExtractionPayload; stripped: string[] } {
    const out: ExtractionPayload = JSON.parse(JSON.stringify(payload));
    const stripped: string[] = [];

    // identity
    const identityFields: Array<{ key: keyof NonNullable<ExtractionPayload['identity']>; flag: string }> = [
      { key: 'firstName',   flag: 'name'     },
      { key: 'lastName',    flag: 'name'     },
      { key: 'fullName',    flag: 'name'     },
      { key: 'emails',      flag: 'email'    },
      { key: 'phones',      flag: 'phone'    },
      { key: 'location',    flag: 'location' },
      { key: 'linkedinUrl', flag: 'linkedin' },
      // websites isn't in the platform default allowlist; treat as part of `linkedin` for now.
      { key: 'websites',    flag: 'linkedin' },
    ];
    if (out.identity) {
      const allowIdentity = extractFields['identity'] ?? {};
      for (const { key, flag } of identityFields) {
        if (allowIdentity[flag] !== true && out.identity[key] !== undefined) {
          stripped.push(`identity.${key}`);
          delete out.identity[key];
        }
      }
      if (Object.keys(out.identity).length === 0) delete out.identity;
    }

    // professional
    if (out.professional) {
      const allow = extractFields['professional'] ?? {};
      if (allow['skills']         !== true && out.professional.skills         !== undefined) { stripped.push('professional.skills');         delete out.professional.skills; }
      if (allow['experience']     !== true && out.professional.experience     !== undefined) { stripped.push('professional.experience');     delete out.professional.experience; }
      if (allow['currentCompany'] !== true && out.professional.currentCompany !== undefined) { stripped.push('professional.currentCompany'); delete out.professional.currentCompany; }
      if (allow['currentTitle']   !== true && out.professional.currentTitle   !== undefined) { stripped.push('professional.currentTitle');   delete out.professional.currentTitle; }
      // summary tags along with experience for now (no separate flag in defaults)
      if (allow['experience']     !== true && out.professional.summary        !== undefined) { stripped.push('professional.summary');        delete out.professional.summary; }
      if (Object.keys(out.professional).length === 0) delete out.professional;
    }

    // education
    if (out.education?.length) {
      const allow = extractFields['education'] ?? {};
      if (allow['degree'] !== true || allow['institution'] !== true) {
        out.education = out.education.map((e) => {
          const clone = { ...e };
          if (allow['degree']      !== true) { stripped.push('education[].degree');      delete clone.degree; delete clone.fieldOfStudy; delete clone.grade; }
          if (allow['institution'] !== true) { stripped.push('education[].institution'); delete clone.institution; }
          return clone;
        });
        // If both removed and nothing else left, drop the array
        if (out.education.every((e) => Object.keys(e).length === 0)) {
          delete out.education;
        }
      }
    }

    // additional
    if (out.additional) {
      const allow = extractFields['additional'] ?? {};
      if (allow['certifications'] !== true && out.additional.certifications !== undefined) { stripped.push('additional.certifications'); delete out.additional.certifications; }
      if (allow['languages']      !== true && out.additional.languages      !== undefined) { stripped.push('additional.languages');      delete out.additional.languages; }
      if (allow['projects']       !== true && out.additional.projects       !== undefined) { stripped.push('additional.projects');       delete out.additional.projects; }
      if (Object.keys(out.additional).length === 0) delete out.additional;
    }

    // recruiting (most sensitive — CTC, visa, etc.)
    if (out.recruiting) {
      const allow = extractFields['recruiting'] ?? {};
      if (allow['noticePeriod']      !== true && out.recruiting.noticePeriodDays  !== undefined) { stripped.push('recruiting.noticePeriodDays');  delete out.recruiting.noticePeriodDays; }
      if (allow['currentCtc']        !== true && out.recruiting.currentCtc        !== undefined) { stripped.push('recruiting.currentCtc');        delete out.recruiting.currentCtc; }
      if (allow['expectedCtc']       !== true && out.recruiting.expectedCtc       !== undefined) { stripped.push('recruiting.expectedCtc');       delete out.recruiting.expectedCtc; }
      if (allow['visaStatus']        !== true && out.recruiting.visaStatus        !== undefined) { stripped.push('recruiting.visaStatus');        delete out.recruiting.visaStatus; }
      if (allow['workAuthorization'] !== true && out.recruiting.workAuthorization !== undefined) { stripped.push('recruiting.workAuthorization'); delete out.recruiting.workAuthorization; }
      // availableFrom only persisted when noticePeriod is enabled (operational coupling).
      if (allow['noticePeriod']      !== true && out.recruiting.availableFrom     !== undefined) { stripped.push('recruiting.availableFrom');     delete out.recruiting.availableFrom; }
      if (Object.keys(out.recruiting).length === 0) delete out.recruiting;
    }

    // customFields — only allow declared IDs
    if (out.customFields && typeof out.customFields === 'object') {
      for (const k of Object.keys(out.customFields)) {
        if (!customFieldIds.has(k)) {
          stripped.push(`customFields.${k}`);
          delete out.customFields[k];
        }
      }
      if (Object.keys(out.customFields).length === 0) delete out.customFields;
    }

    if (stripped.length) {
      this.logger.debug(`PayloadStripper removed ${stripped.length} field(s): ${stripped.join(', ')}`);
    }

    return { payload: out, stripped };
  }
}

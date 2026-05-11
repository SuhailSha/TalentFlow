import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';

import {
  EMAIL_TEMPLATES,
  type EmailTemplateName,
  type EmailTemplatePayload,
} from './template.registry';

interface RenderedTemplate {
  subject: string;
  html:    string;
  text:    string;
}

/**
 * Compiled-once template cache. Handlebars compilation is non-trivial; we
 * compile each template once on first use and reuse the compiled function.
 */
@Injectable()
export class TemplateRenderer {
  private readonly subjectCache = new Map<string, HandlebarsTemplateDelegate>();
  private readonly htmlCache    = new Map<string, HandlebarsTemplateDelegate>();
  private readonly textCache    = new Map<string, HandlebarsTemplateDelegate>();

  render<T extends EmailTemplateName>(
    name: T,
    payload: EmailTemplatePayload<T>,
  ): RenderedTemplate {
    const def = EMAIL_TEMPLATES[name];
    if (!def) {
      throw new Error(`Unknown email template: ${name}`);
    }

    const subjectFn = this.compile(this.subjectCache, name, def.subject);
    const htmlFn    = this.compile(this.htmlCache,    name, def.html);
    const textFn    = this.compile(this.textCache,    name, def.text);

    return {
      subject: subjectFn(payload as Record<string, unknown>),
      html:    htmlFn(payload as Record<string, unknown>),
      text:    textFn(payload as Record<string, unknown>),
    };
  }

  private compile(
    cache: Map<string, HandlebarsTemplateDelegate>,
    name: string,
    source: string,
  ): HandlebarsTemplateDelegate {
    const cached = cache.get(name);
    if (cached) return cached;
    const compiled = Handlebars.compile(source, { noEscape: false });
    cache.set(name, compiled);
    return compiled;
  }
}

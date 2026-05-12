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

    // Subject and text are non-HTML contexts. Handlebars' default escaping
    // turns `=` into `&#x3D;` which breaks copy/paste of links in plain-text
    // mail clients. Decode the few entities Handlebars introduces.
    return {
      subject: decodeNonHtml(subjectFn(payload as Record<string, unknown>)),
      html:    htmlFn(payload as Record<string, unknown>),
      text:    decodeNonHtml(textFn(payload as Record<string, unknown>)),
    };
  }

  private compile(
    cache: Map<string, HandlebarsTemplateDelegate>,
    cacheKey: string,
    source: string,
  ): HandlebarsTemplateDelegate {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const compiled = Handlebars.compile(source);
    cache.set(cacheKey, compiled);
    return compiled;
  }
}

/** Undo the small set of HTML entities Handlebars' escapeExpression introduces. */
function decodeNonHtml(s: string): string {
  return s
    .replace(/&#x3D;/g, '=')
    .replace(/&#x27;/g, "'")
    .replace(/&#x60;/g, '`')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&amp;/g,  '&');
}

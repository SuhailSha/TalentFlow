/**
 * Email template registry.
 *
 * Templates are defined inline (subject + html + text) rather than separate
 * files so the typed payload shape lives next to the template that consumes it.
 * Handlebars syntax is used for variable interpolation: {{name}}.
 *
 * Conventions:
 *   - Every template MUST provide both `html` and `text` bodies.
 *   - Subjects use Handlebars too so they can reference org names, etc.
 *   - Payload types are exported so callers get compile-time safety.
 *
 * Adding a template:
 *   1. Define the payload interface and export it.
 *   2. Add an entry to EMAIL_TEMPLATES keyed by a snake_case template name.
 *   3. Update EmailTemplateName and EmailTemplatePayload below.
 *   4. (Optional) Reference the template name from a service via a constant.
 */

export interface UserInvitationPayload {
  inviterName:    string;
  organizationName: string;
  recipientName:  string;
  acceptUrl:      string;
  expiresInHours: number;
}

export interface ReminderDueSoonPayload {
  recipientName: string;
  reminderTitle: string;
  reminderDescription: string;
  dueAt:         string;     // already-formatted human string
  contextUrl:    string;     // deep-link to the related workspace
}

export interface InterviewFeedbackPendingPayload {
  recipientName:  string;
  candidateName:  string;
  jobTitle:       string;
  completedAt:    string;
  feedbackUrl:    string;
}

export interface InterviewUpcomingPayload {
  recipientName:    string;
  candidateName:    string;
  jobTitle:         string;
  scheduledAtHuman: string;
  interviewUrl:     string;
}

interface TemplateDefinition<TPayload> {
  /** Handlebars-templated subject. */
  subject: string;
  /** Handlebars-templated HTML body. */
  html:    string;
  /** Handlebars-templated plain-text body. */
  text:    string;
  /** Type marker — never read at runtime, used for compile-time inference. */
  __payload?: TPayload;
}

// Reusable HTML shell. Kept inline rather than as a separate partial to avoid
// the Handlebars partial registration ceremony for one layout.
const wrapHtml = (title: string, body: string, footer: string): string => `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${title}</title>
</head>
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width:600px;width:100%;background:#fff;border-radius:8px;padding:24px;">
    <tr><td>${body}</td></tr>
    <tr><td style="padding-top:24px;border-top:1px solid #eee;color:#888;font-size:12px;">${footer}</td></tr>
  </table>
</body>
</html>`.trim();

export const EMAIL_TEMPLATES = {
  user_invitation: {
    subject: '{{inviterName}} invited you to {{organizationName}}',
    html: wrapHtml(
      'You are invited',
      `
      <h2 style="margin-top:0;">You have been invited to {{organizationName}}</h2>
      <p>Hi {{recipientName}},</p>
      <p><strong>{{inviterName}}</strong> has invited you to join <strong>{{organizationName}}</strong> on the recruitment platform.</p>
      <p>To accept the invitation and set your password, click the button below. This link will expire in {{expiresInHours}} hours.</p>
      <p style="margin:24px 0;">
        <a href="{{acceptUrl}}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Accept invitation</a>
      </p>
      <p style="font-size:13px;color:#666;">Or copy this link into your browser:<br><span style="word-break:break-all;">{{acceptUrl}}</span></p>
      `,
      'If you did not expect this invitation, you can safely ignore this email.',
    ),
    text: `Hi {{recipientName}},

{{inviterName}} has invited you to join {{organizationName}} on the recruitment platform.

Accept the invitation by visiting:
{{acceptUrl}}

This link will expire in {{expiresInHours}} hours.

If you did not expect this invitation, you can safely ignore this email.`,
  } satisfies TemplateDefinition<UserInvitationPayload>,

  reminder_due_soon: {
    subject: 'Reminder: {{reminderTitle}}',
    html: wrapHtml(
      'Reminder',
      `
      <h2 style="margin-top:0;">{{reminderTitle}}</h2>
      <p>Hi {{recipientName}},</p>
      <p>{{reminderDescription}}</p>
      <p><strong>Due:</strong> {{dueAt}}</p>
      <p style="margin:24px 0;">
        <a href="{{contextUrl}}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Open in platform</a>
      </p>
      `,
      'You are receiving this because you are the assignee on this reminder.',
    ),
    text: `Hi {{recipientName}},

Reminder: {{reminderTitle}}
{{reminderDescription}}

Due: {{dueAt}}

Open: {{contextUrl}}`,
  } satisfies TemplateDefinition<ReminderDueSoonPayload>,

  interview_feedback_pending: {
    subject: 'Feedback pending: {{candidateName}} for {{jobTitle}}',
    html: wrapHtml(
      'Interview feedback pending',
      `
      <h2 style="margin-top:0;">Feedback pending</h2>
      <p>Hi {{recipientName}},</p>
      <p>You interviewed <strong>{{candidateName}}</strong> for <strong>{{jobTitle}}</strong> on {{completedAt}}. Please submit your feedback so the hiring team can move forward.</p>
      <p style="margin:24px 0;">
        <a href="{{feedbackUrl}}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Submit feedback</a>
      </p>
      `,
      'You are receiving this because you were the interviewer on this round.',
    ),
    text: `Hi {{recipientName}},

You interviewed {{candidateName}} for {{jobTitle}} on {{completedAt}}.
Please submit your feedback so the hiring team can move forward.

Submit feedback: {{feedbackUrl}}`,
  } satisfies TemplateDefinition<InterviewFeedbackPendingPayload>,

  interview_upcoming: {
    subject: 'Interview tomorrow: {{candidateName}} for {{jobTitle}}',
    html: wrapHtml(
      'Upcoming interview',
      `
      <h2 style="margin-top:0;">Upcoming interview</h2>
      <p>Hi {{recipientName}},</p>
      <p>Reminder: you have an interview scheduled with <strong>{{candidateName}}</strong> for <strong>{{jobTitle}}</strong>.</p>
      <p><strong>When:</strong> {{scheduledAtHuman}}</p>
      <p style="margin:24px 0;">
        <a href="{{interviewUrl}}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">View interview</a>
      </p>
      `,
      'You are receiving this because you are scheduled as an interviewer.',
    ),
    text: `Hi {{recipientName}},

Reminder: you have an interview scheduled.
Candidate: {{candidateName}}
Role: {{jobTitle}}
When: {{scheduledAtHuman}}

View: {{interviewUrl}}`,
  } satisfies TemplateDefinition<InterviewUpcomingPayload>,
} as const;

export type EmailTemplateName = keyof typeof EMAIL_TEMPLATES;

/** Maps a template name to its payload type. */
export type EmailTemplatePayload<T extends EmailTemplateName> =
  (typeof EMAIL_TEMPLATES)[T] extends TemplateDefinition<infer P> ? P : never;

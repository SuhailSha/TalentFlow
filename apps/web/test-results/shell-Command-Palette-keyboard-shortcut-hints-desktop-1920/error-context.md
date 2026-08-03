# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shell.spec.ts >> Command Palette >> keyboard shortcut hints
- Location: tests\vr\shell.spec.ts:70:7

# Error details

```
Test timeout of 30000ms exceeded while setting up "authedPage".
```

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - img [ref=e6]:
          - generic [ref=e7]: TF
        - generic [ref=e8]:
          - generic [ref=e9]: TalentFlow
          - generic [ref=e10]: Recruitment intelligence for staffing teams
      - generic [ref=e11]:
        - paragraph [ref=e12]: Hire with momentum.
        - list [ref=e13]:
          - listitem [ref=e14]: Pipeline you can see — at every stage, for every recruiter.
          - listitem [ref=e16]: Inbox you can clear — overdue items surface, never hide.
          - listitem [ref=e18]: Resume intelligence that actually helps — parse, review, dedupe.
      - paragraph [ref=e20]: © TalentFlow
    - main [ref=e21]:
      - generic [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e24]:
            - heading "Sign in" [level=3] [ref=e25]
            - paragraph [ref=e26]: Welcome back. Enter your workspace to continue.
          - generic [ref=e28]:
            - generic [ref=e29]:
              - text: Workspace
              - textbox "Workspace" [ref=e30]:
                - /placeholder: acme
                - text: vr-tenant
            - generic [ref=e31]:
              - text: Email
              - textbox "Email" [ref=e32]:
                - /placeholder: you@company.com
                - text: vr@vr-tenant.demo
            - generic [ref=e33]:
              - generic [ref=e34]:
                - generic [ref=e35]: Password
                - generic [ref=e36]: Forgot?
              - textbox "Password" [ref=e37]:
                - /placeholder: ••••••••
                - text: Demo1234!
            - button "Sign in" [ref=e38] [cursor=pointer]
        - paragraph [ref=e39]: Secure access · Your workspace identifier is the lowercase URL slug.
  - generic [ref=e40]:
    - img [ref=e42]
    - button "Open Tanstack query devtools" [ref=e90] [cursor=pointer]:
      - img [ref=e91]
  - generic [ref=e143] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e144]:
      - img [ref=e145]
    - generic [ref=e148]:
      - button "Open issues overlay" [ref=e149]:
        - generic [ref=e150]:
          - generic [ref=e151]: "3"
          - generic [ref=e152]: "4"
        - generic [ref=e153]:
          - text: Issue
          - generic [ref=e154]: s
      - button "Collapse issues badge" [ref=e155]:
        - img [ref=e156]
  - alert [ref=e158]
```

# Test source

```ts
  1  | import { test as base, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Fixture-tenant login helper for visual-regression tests.
  5  |  *
  6  |  * The seed script (packages/database/scripts/seed-vr.cjs — created in
  7  |  * follow-up) provisions a stable tenant `vr-tenant` with fixture data
  8  |  * (10 candidates, 3 jobs, 5 submissions, 8 notifications) so every
  9  |  * baseline captures identical content.
  10 |  *
  11 |  * Credentials come from environment variables so CI can rotate them;
  12 |  * defaults match the seed script's output for local runs.
  13 |  */
  14 | 
  15 | const VR_TENANT_SLUG    = process.env['E2E_VR_TENANT']   ?? 'vr-tenant';
  16 | const VR_EMAIL          = process.env['E2E_VR_EMAIL']    ?? 'vr@acme-demo.com';
  17 | const VR_PASSWORD       = process.env['E2E_VR_PASSWORD'] ?? 'Demo1234!';
  18 | 
  19 | export const test = base.extend<{ authedPage: import('@playwright/test').Page }>({
  20 |   authedPage: async ({ page }, use) => {
  21 |     // Programmatic login: hit /login, fill the form, wait for redirect
  22 |     // to the dashboard. Alternative would be to `page.context().addCookies`
  23 |     // with a pre-issued JWT but that requires the seed script to output
  24 |     // one; login-via-form is more portable.
  25 |     await page.goto('/login');
  26 |     await page.getByLabel(/Workspace/i).fill(VR_TENANT_SLUG);
  27 |     await page.getByLabel(/Email/i).fill(VR_EMAIL);
  28 |     await page.getByLabel(/Password/i).fill(VR_PASSWORD);
  29 |     await page.getByRole('button', { name: /Sign in/i }).click();
> 30 |     await page.waitForURL('**/dashboard', { timeout: 10_000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  31 |     await use(page);
  32 |   },
  33 | });
  34 | 
  35 | export { expect };
  36 | 
```
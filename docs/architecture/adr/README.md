# Architecture Decision Records

This directory contains TalentFlow's Architecture Decision Records (ADRs). An
ADR captures a single decision, its context, and its consequences. New ADRs are
proposed via PR; once approved they become **Accepted** and immutable. To
change an Accepted decision, a new ADR supersedes the old one — never edit an
existing ADR.

| # | Title | Status |
|---|---|---|
| [001](adr-001-multi-tenancy-strategy.md) | Multi-tenancy strategy | Accepted |
| [002](adr-002-rls-strategy.md) | Row-Level Security strategy | Accepted |
| [003](adr-003-event-architecture.md) | Event architecture | Accepted |
| [004](adr-004-ai-architecture.md) | AI architecture (advisory-only + cost tracking) | Accepted |
| [005](adr-005-search-architecture.md) | Search architecture (provider abstraction) | Accepted |
| [006](adr-006-infrastructure-architecture.md) | Infrastructure architecture | Accepted |
| [007](adr-007-gdpr-strategy.md) | GDPR & data lifecycle strategy | Accepted |

## Template

```
# ADR-NNN — <Title>
Status: Proposed | Accepted | Superseded by ADR-NNN
Date: YYYY-MM-DD

## Context
The forces at play; what we're solving.

## Decision
The choice made, in active voice.

## Consequences
Positive and negative outcomes. What becomes easier; what becomes harder.

## Alternatives considered
Other options weighed, and why they lost.
```

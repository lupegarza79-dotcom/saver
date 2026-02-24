# UI Migration Checklist — Experience → Hub

## Files Created (New)
| File | Purpose |
|------|---------|
| `components/ProgressBar.tsx` | Reusable animated progress bar (step wizard) |
| `components/TrustBadges.tsx` | Reusable trust indicators (No spam, Only if cheaper, Data secure) |
| `components/StepContainer.tsx` | Reusable step wizard wrapper (keyboard, scroll, slide animation, back/next) |
| `app/referral.tsx` | Referral screen — share link, refer directly via name+phone |
| `contexts/SaverContext.tsx` | Saver-specific context integrated with Supabase (leads, quote submit, agent apps, intake) |
| `docs/ui-migration-checklist.md` | This file |
| `docs/frontend-backend-field-map.md` | Field mapping: UI → backend |

## Files Modified
| File | Changes |
|------|---------|
| `app/_layout.tsx` | Added `SaverProvider`, added `referral` route to Stack |
| `app/index.tsx` | Replaced inline trust badges with `<TrustBadges>` component, added referral CTA, removed unused Lock/Star imports |

## Files Kept from Hub (Untouched)
| File | Reason |
|------|--------|
| `backend/*` | Hub backend is source of truth |
| `backend/supabase/schema.sql` | Hub schema is canonical |
| `backend/trpc/*` | Hub tRPC routes preserved |
| `app/admin/*` | Admin dashboard preserved |
| `app/quote-form.tsx` | Already polished wizard with step-based flow, Supabase submit |
| `app/upload-document.tsx` | Already has AI scan, web file picker, consent flow |
| `app/quote-submitted.tsx` | Confirmation screen already done (READY_TO_QUOTE badge, WhatsApp CTA) |
| `app/agents.tsx` | Agent application already done with Supabase submit |
| `app/modal.tsx` | Terms + agent selection modal preserved |
| `contexts/AppContext.tsx` | Core app state preserved |
| `contexts/AnalyticsContext.tsx` | Analytics preserved |
| `constants/i18n.ts` | Full EN/ES translations preserved |
| `types/index.ts` | Hub types (IntakeStatus, CaseStatus, etc.) preserved |
| `types/intake.ts` | Intake types preserved |
| `utils/quoteReadiness.ts` | Readiness logic preserved |
| `lib/supabase.ts` | Supabase client preserved |
| `lib/trpc.ts` | tRPC client preserved |

## Route Changes
| Route | Status |
|-------|--------|
| `/` | Updated (TrustBadges component, referral CTA added) |
| `/referral` | NEW — Referral screen |
| `/quote-form` | Unchanged |
| `/upload-document` | Unchanged |
| `/quote-submitted` | Unchanged |
| `/agents` | Unchanged |
| `/modal` | Unchanged |
| `/admin` | Unchanged |

## _future Screens
All `_future/` screens remain isolated and are NOT registered in active routes.

## Status Enums (Canonical)
- `WAITING_DOCS` — Docs not yet received
- `NEEDS_INFO` — Missing required fields
- `READY_TO_QUOTE` — All required fields present, can quote

## Product Rules Preserved
- Reverse quoting (we find savings, not cold call)
- No cold calling
- Contact only if savings threshold met or user requested
- WhatsApp-first contact preference
- Forms are short, step-based
- EN/ES bilingual support
- Texas minimum coverage = 30/60/25

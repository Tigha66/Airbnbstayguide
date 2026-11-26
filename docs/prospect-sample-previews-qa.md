# Prospect sample previews — isolated QA

Status: QA only, 26 November 2026.

- Ten expiring bearer links are stored in the isolated Neon QA branch in `property_sample_previews`; only token hashes are persisted.
- The page requires `VERCEL_ENV=preview`, `SAMPLE_PREVIEWS_ENABLED=true`, a matching slug and token, and an unexpired record. It is noindex and does not load property photographs, logos, access codes, or guest data.
- Each page identifies itself as an unofficial concept, cites its public source, and marks missing arrival/departure instructions for operator confirmation.
- Five matching Gmail drafts were revised in place and five new personalized drafts were created; all ten remain unsent. The Vercel Preview redirects visitors to Vercel login, so the sample URLs are internal QA links only. Do not send these drafts until external prospect access is separately made safe.
- The feature flag and data are scoped to the isolated PR #40 Preview/QA environment. Do not enable the flags in Production.
- Preview tokens expire 30 days after creation. Regenerate by replacing the corresponding token hash in QA only.
- Keep the 27 November follow-up automation drafts-only. It must reuse/update a matching draft and skip any lead that has declined, opted out, or bounced. A matching personalized sample draft counts as the follow-up draft for that property.

Prospect sample slugs:
`amos-denstone-lodge`, `isaacs-cottage`, `brambles-forest-dean`, `old-millhouse-dalkeith`, `beach-house-apartments-porth`, `rose-suite-woking`, `dinas-ddu-beddgelert`, `harveys-corner-cottage`, `salt-lodge-st-ives`, `west-street-covent-garden`.

Known exclusion: HB Holiday Lettings declined. It is not included.

# Prospect sample previews — QA status

Status: isolated QA only, 26 November 2026. The ten sample records and their outreach history are retained.

## Sample safeguards implemented

- Ten expiring bearer links are backed by the isolated Neon QA branch. Only SHA-256 token hashes are stored.
- The route requires Preview environment, the explicit sample flag, a matching slug and token, and a non-expired record. It is noindex and sets a no-referrer policy.
- Pages show a clear unofficial-sample disclaimer, cite their public source, avoid property photography/logos/access codes/guest data, and mark arrival or departure facts that require operator confirmation.
- Each guide includes an offer link. No live booking, property endorsement, or customer relationship is implied.
- Founder enquiry retrieval is behind a verified owner session and admin-email check; there is no public list route.

## Access blocker — do not send outreach

The separate Vercel project `getstayguide-prospect-samples` is currently in ERROR for branch head `9ac5d06090246c5b6f04b4287a379dd756b1f840`. Vercel's deployment detail reports `NOW_SANDBOX_WORKER_ROOTDIR_NOT_EXIST`: the project root is configured as `apps/public-samples`, which is absent from the repository. Earlier preview deployments also enforced Vercel login. Therefore:

- The ten links are **not** verified as publicly accessible.
- No incognito or mobile test has passed.
- Do not send the ten personalized outreach drafts until a public, route-restricted deployment is working and each link has been checked.
- Fixing only Vercel SSO would expose unrelated app routes, so do not disable protection without first deploying an isolated sample-only surface.

## Lead history and draft handling

Existing samples and outreach records are preserved; no customer email was sent. Five matching Gmail drafts were revised in place and five personalized drafts were created. Keep the 27 November follow-up task drafts-only: reuse or update a matching draft, do not create duplicate campaigns, and skip anyone who declined, opted out, or bounced. HB Holiday Lettings declined and remains excluded.

Sample slugs:
`amos-denstone-lodge`, `isaacs-cottage`, `brambles-forest-dean`, `old-millhouse-dalkeith`, `beach-house-apartments-porth`, `rose-suite-woking`, `dinas-ddu-beddgelert`, `harveys-corner-cottage`, `salt-lodge-st-ives`, `west-street-covent-garden`.

Access tokens are intentionally omitted from this repository document.

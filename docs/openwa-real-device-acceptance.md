# OpenWA real-device acceptance procedure — draft only

**Current mode:** live WhatsApp remains disabled. This is a controlled QA runbook, not permission to pair a device, activate a webhook, restart a service, or send a message.

## Required approvals and isolation

Before the live-device stage, obtain separate owner approval for (1) pairing the designated sender device, (2) activating the QA webhook, and (3) sending the explicitly agreed test messages to the previously authorised test participants. These are separate gates.

- Confirm the QA Vercel deployment is Preview and the OPENWA_QA_SYNTHETIC_TRANSPORT guard is understood; synthetic transport must never call the gateway.
- Confirm the isolated QA database and test property are selected. Verify by project/deployment identifiers; do not use a production connection string.
- Confirm the VPS inventory, backup, staged image and container/network/volume mapping using read-only commands first. Do not stop, restart, recreate, or prune containers. Preserve OpenWA, Traefik, CallPilot, RingBack and GetStayGuide production.
- Independently compare the configured session, sender, guest and host-email allowlists with the owner-authorised values. Do not assume masked values match. Do not print secrets or full phone numbers into logs, URLs, screenshots or PR comments.
- Use an authenticated QA callback over HTTPS with an HMAC signature over the raw request body. Keep the signing key in server-side secret storage. Do not put a Vercel Protection Bypass credential or webhook secret in a URL, query string, browser storage, or client JavaScript.
- Confirm the sender and guest are distinct, the sender session is the dedicated QA session, and the guest has explicitly opted in. Confirm rate limits and duplicate-event handling are enabled.

## Two-device acceptance sequence

Only after each approval gate above is complete:

1. Pair only the designated sender device to the isolated QA session; verify the session identifier without displaying it.
2. Enable only the QA callback route. Send one approved invitation from the sender to the authorised guest device, clearly identifying the test and opt-in instruction.
3. On the guest device, send the opt-in keyword. Confirm an authenticated callback records consent in the QA tenant.
4. Send one agreed inbound test question. Confirm exactly one message appears in the correct owner's QA inbox; verify an unrelated account cannot read it.
5. Send one approved host reply from the QA inbox. Confirm delivery on the guest device and that the message did not originate from the production account.
6. Send the opt-out keyword. Confirm consent is cleared and later inbound messages are not stored or surfaced.
7. Confirm expired consent, duplicate callback replay, invalid signature, wrong session, wrong sender, and wrong guest are rejected or ignored. Do not send extra real-device messages to test rejected cases; use synthetic signed fixtures for those.
8. Disable the QA webhook and synthetic route, safely remove only clearly marked QA test rows/property, and verify production services and containers were not modified.

## Stop conditions and evidence

Stop immediately on any production session/URL, mismatched allowlist, invalid signature, unexpected recipient, duplicate delivery, cross-tenant visibility, missing backup, or unclear container ownership. Record only test outcome, deployment ID, masked event identifiers and timestamps. Never store QR codes, authentication keys, webhook secrets, or full participant numbers in the evidence.

**Approval status:** not authorised for pairing, webhook activation, or real messages.
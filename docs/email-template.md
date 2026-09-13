> Current checkpoint (2026-09-13): implementation complete; release verification blocked. The permitted unit suite passes 91 tests across 9 files. See [../HANDOFF.md](../HANDOFF.md) for constraints and durable evidence. Operational and other verification commands below remain future reference only.

# Application email design

All application emails share `ops/email-template.mjs`. It is dependency-free so both Next.js authentication and the standalone systemd alert sender can use it. Install that module alongside `ops/alert.mjs` on the server.

`verificationEmail(code)` produces the authentication message. `maintenanceEmail(unit)` produces operational alerts. For another transactional message, call `emailTemplate({ preview, eyebrow, title, paragraphs, note, action })` and pass both returned `html` and `text` to the sender. All supplied content is plain text and escaped; do not pass HTML. Actions require an HTTPS URL. Never add credentials or private research results to an alert.

The shared design uses a forest-green header, mint accent, light reading surface, a prominent six-digit code, and a support/privacy footer. Layout tables, inline styles, system fonts, an Outlook width fallback, a hidden preview line, and a mobile media query provide broad email-client compatibility. No remote images, web fonts, scripts or tracking pixels are included by the template. Actual rendering can vary by inbox client and its dark-mode settings.

The sender is Fomo Lens <noreply@sholaayeni.xyz>; support and alerts go to ayenisholah@yahoo.com. A plain-text alternative accompanies every message. Code messages use a delivery idempotency key tied to the authentication challenge.

September 13 verification: rendered at 720px and 390px without horizontal overflow; escaping, code validation, HTTPS actions, and text alternatives tested. Resend accepted the HTML preview and the owner approved the design. The owner separately confirmed receipt of the initial delivery test.

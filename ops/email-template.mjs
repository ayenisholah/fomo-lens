export const EMAIL_FROM = "Fomo Lens <noreply@sholaayeni.xyz>";
export const SUPPORT_EMAIL = "ayenisholah@yahoo.com";
const APP_URL = "https://fomo-lens.sholaayeni.xyz";
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

/** Shared, dependency-free layout for application and systemd emails. All content is plain text. */
export function emailTemplate({
  preview,
  eyebrow = "ACCOUNT UPDATE",
  title,
  paragraphs,
  code,
  note,
  action,
}) {
  if (code !== undefined && !/^\d{6}$/.test(code))
    throw new Error("Expected a six-digit email code");
  if (action && new URL(action.url).protocol !== "https:")
    throw new Error("Email actions require HTTPS");
  const text = [
    title,
    ...paragraphs,
    ...(code ? [code] : []),
    ...(note ? [note] : []),
    ...(action ? [action.label + ": " + action.url] : []),
    "Fomo Lens · Independent research, considered carefully.",
    "Need a hand? " + SUPPORT_EMAIL,
  ].join("\n\n");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escape(title)}</title>
<style>@media only screen and (max-width:600px){.outer{padding:24px 12px!important}.content{padding:32px 24px!important}.headline{font-size:30px!important}.code{font-size:34px!important;letter-spacing:8px!important}}</style></head>
<body style="margin:0;padding:0;background-color:#eef2ee;color:#172b24;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escape(preview)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#eef2ee"><tr><td class="outer" align="center" style="padding:48px 20px;">
<!--[if mso]><table role="presentation" width="560" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 24px;"><a href="${APP_URL}" style="text-decoration:none;color:#172b24;font-size:22px;letter-spacing:-.7px;"><span aria-hidden="true" style="color:#43765c;font-size:27px;vertical-align:-1px;">◉</span>&nbsp; Fomo <strong>Lens</strong></a></td></tr>
<tr><td style="background-color:#102b22;border-radius:16px 16px 0 0;padding:28px 36px;border-bottom:3px solid #b9f6cf;"><p style="margin:0;color:#b9f6cf;font-size:11px;line-height:18px;font-weight:700;letter-spacing:2px;">${escape(eyebrow)}</p></td></tr>
<tr><td class="content" style="padding:40px 36px;background-color:#ffffff;border-left:1px solid #dce5dd;border-right:1px solid #dce5dd;">
<h1 class="headline" style="margin:0 0 20px;color:#172b24;font-size:36px;line-height:1.15;font-weight:600;letter-spacing:-1.2px;">${escape(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 18px;color:#52635a;font-size:16px;line-height:26px;">${escape(p)}</p>`).join("")}
${code ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;"><tr><td align="center" style="padding:24px 12px;background-color:#eff7f0;border:1px solid #d8e9da;border-radius:10px;"><p style="margin:0 0 10px;color:#52635a;font-size:10px;font-weight:700;letter-spacing:1.5px;">YOUR VERIFICATION CODE</p><p class="code" style="margin:0;color:#173e2a;font-family:'Courier New',monospace;font-size:40px;line-height:48px;font-weight:700;letter-spacing:10px;">${code}</p><p style="margin:12px 0 0;color:#52635a;font-size:12px;line-height:18px;">Expires in 10 minutes · Use once</p></td></tr></table>` : ""}
${action ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;"><tr><td bgcolor="#173e2a" style="border-radius:7px;"><a href="${escape(action.url)}" style="display:inline-block;padding:15px 24px;border:1px solid #173e2a;border-radius:7px;color:#ffffff;font-size:14px;line-height:20px;font-weight:700;text-decoration:none;mso-padding-alt:0;"><!--[if mso]><i style="mso-font-width:150%;mso-text-raise:22pt;" hidden>&emsp;</i><![endif]-->${escape(action.label)}<!--[if mso]><i style="mso-font-width:150%;" hidden>&emsp;&#8203;</i><![endif]--></a></td></tr></table>` : ""}
${note ? `<p style="margin:24px 0 0;padding-top:22px;border-top:1px solid #e6ece6;color:#66766c;font-size:13px;line-height:21px;">${escape(note)}</p>` : ""}
</td></tr>
<tr><td style="padding:20px 36px;background-color:#f7faf6;border:1px solid #dce5dd;border-top:0;border-radius:0 0 16px 16px;color:#52635a;font-size:12px;line-height:20px;">Need a hand? <a href="mailto:${SUPPORT_EMAIL}" style="color:#26573c;text-decoration:underline;">Contact support</a></td></tr>
<tr><td align="center" style="padding:26px 12px 0;color:#68796e;font-size:11px;line-height:19px;">Fomo Lens<br>Independent research, considered carefully.<br><a href="${APP_URL}/privacy" style="color:#68796e;text-decoration:underline;">Privacy</a>&nbsp; · &nbsp;<a href="${APP_URL}/methodology" style="color:#68796e;text-decoration:underline;">Methodology</a></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  return { html, text };
}
export function verificationEmail(code) {
  return emailTemplate({
    preview: "Your one-time sign-in code is ready. It expires in ten minutes.",
    eyebrow: "YOUR RESEARCH STARTS HERE",
    title: "A closer look awaits.",
    paragraphs: [
      "Enter this code in Fomo Lens to sign in and continue your research.",
    ],
    code,
    note: "Signing in creates a seven-day session on this device. Never share this code. If you didn’t request it, you can safely ignore this email.",
  });
}
export function maintenanceEmail(unit) {
  return emailTemplate({
    preview: "An operational task needs your attention.",
    eyebrow: "OPERATIONS ALERT",
    title: "A task needs attention.",
    paragraphs: [
      "An application task did not complete successfully.",
      "Affected unit: " + unit,
      "Inspect the service journal on the server, resolve the failure, and rerun the task.",
    ],
    note: "This alert contains no database credentials or research data. A failed backup does not replace the last successful backup.",
  });
}

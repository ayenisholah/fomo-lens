import {
  EMAIL_FROM,
  SUPPORT_EMAIL,
  maintenanceEmail,
} from "./email-template.mjs";
const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  signal: AbortSignal.timeout(15000),
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: EMAIL_FROM,
    to: SUPPORT_EMAIL,
    subject: "Fomo Lens maintenance failed",
    ...maintenanceEmail(process.argv[2] ?? "unknown"),
  }),
});
if (!response.ok) throw new Error("Failure alert delivery failed");

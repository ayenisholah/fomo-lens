import { it, expect } from "vitest";
import {
  emailTemplate,
  verificationEmail,
  maintenanceEmail,
} from "../ops/email-template.mjs";
it("escapes untrusted email text and limits action URLs", () => {
  const email = emailTemplate({
    preview: "<script>",
    title: "A & B",
    paragraphs: ['<img src=x onerror="bad">'],
    action: { label: "Open", url: 'https://example.com/?x="' },
  });
  expect(email.html).not.toContain("<img src=x");
  expect(email.html).toContain("&lt;img");
  expect(email.html).toContain("A &amp; B");
  expect(() =>
    emailTemplate({
      preview: "",
      title: "",
      paragraphs: [],
      action: { label: "", url: "javascript:alert(1)" },
    }),
  ).toThrow();
});
it("uses one accessible layout and plain-text alternative for codes and alerts", () => {
  const email = verificationEmail("012345");
  expect(email.html).toContain("012345");
  expect(email.text).toContain("012345");
  expect(email.html).toContain('role="presentation"');
  expect(email.html).toContain('lang="en"');
  expect(email.text).toContain("seven-day");
  expect(maintenanceEmail("backup.service").html).toContain("backup.service");
  expect(() => verificationEmail("<12345")).toThrow();
});

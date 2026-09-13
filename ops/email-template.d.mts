export const EMAIL_FROM: string;
export const SUPPORT_EMAIL: string;
export type EmailContent = { html: string; text: string };
export function emailTemplate(input: {
  preview: string;
  eyebrow?: string;
  title: string;
  paragraphs: string[];
  code?: string;
  note?: string;
  action?: { label: string; url: string };
}): EmailContent;
export function verificationEmail(code: string): EmailContent;
export function maintenanceEmail(unit: string): EmailContent;

import { beforeAll } from "vitest";
beforeAll(() => {
  Object.assign(process.env, {
    DATABASE_URL: "postgres://test@localhost/fomo_lens_test",
    APP_URL: "http://localhost:3000",
    AUTH_SECRET: "a".repeat(40),
    IP_HASH_SECRET: "b".repeat(40),
    CURSOR_SECRET: "c".repeat(40),
    FOMOLENS_MODE: "example",
    FOMOLENS_KEY: "",
    RESEND_API_KEY: "",
    RESEND_FROM: "test@example.invalid",
    NODE_ENV: "test",
    DEV_EMAIL_SIMULATION: "false",
    TEST_MAIL_DIR: "",
    TRUST_PROXY: "false",
    ADMIN_EMAILS: "ayenisholah@yahoo.com",
    SERVICE_CONCURRENCY: "1",
  });
});

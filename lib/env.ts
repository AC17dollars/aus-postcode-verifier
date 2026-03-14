import { z } from "zod";

const schema = z.object({
  ELASTIC_NODE: z.url("ELASTIC_NODE must be a valid URL"),
  ELASTIC_API_KEY: z.string().min(1, "ELASTIC_API_KEY is required"),
  AUSPOST_API_URL: z.url("AUSPOST_API_URL must be a valid URL"),
  AUSPOST_API_KEY: z.string().min(1, "AUSPOST_API_KEY is required"),
  // Gmail SMTP (use App Password with 2-Step Verification)
  SMTP_HOST: z.string().min(1).optional().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.email("SMTP_USER must be a valid email"),
  SMTP_PASSWORD: z.string().min(1, "SMTP_PASSWORD is required"),
  SMTP_FROM: z.string("SMTP_FROM is required"),
  APP_URL: z.string().optional().default("http://localhost:3000"),
});

export const env = schema.parse(process.env);

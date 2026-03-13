import { z } from "zod/v4";

const schema = z.object({
  ELASTIC_NODE: z.url("ELASTIC_NODE must be a valid URL"),
  ELASTIC_API_KEY: z.string().min(1, "ELASTIC_API_KEY is required"),
  AUSPOST_API_URL: z.url("AUSPOST_API_URL must be a valid URL"),
  AUSPOST_API_KEY: z.string().min(1, "AUSPOST_API_KEY is required"),
});

export const env = schema.parse(process.env);

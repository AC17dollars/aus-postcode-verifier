import { z } from "zod/v4";

const schema = z.object({
  ELASTIC_NODE: z
    .url()
    .default(
      "https://lawpath-test-cluster-aba117.es.ap-southeast-1.aws.elastic.cloud:443",
    ),
  ELASTIC_API_KEY: z.string().min(1, "ELASTIC_API_KEY is required"),
});

export const env = schema.parse(process.env);

import { z } from "zod";

const AU_STATES = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
] as const;

export const addressVerifierSchema = z.object({
  postcode: z
    .string()
    .min(1, "Postcode is required")
    .regex(/^\d{4}$/, "Postcode must be a 4-digit Australian postcode"),
  suburb: z
    .string()
    .min(1, "Suburb is required")
    .max(100, "Suburb name is too long"),
  state: z
    .string()
    .min(1, "Please select a state")
    .refine((s) => (AU_STATES as readonly string[]).includes(s), "Invalid state"),
});

export type AddressVerifierFormValues = z.infer<typeof addressVerifierSchema>;
export const AU_STATE_OPTIONS = AU_STATES;

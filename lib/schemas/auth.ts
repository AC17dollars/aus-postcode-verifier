import { z } from "zod";

const emailSchema = z
  .email("Please enter a valid email address")
  .min(1, "Email is required");

const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters");

const nameSchema = z
  .string()
  .min(1, "Full name is required")
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;

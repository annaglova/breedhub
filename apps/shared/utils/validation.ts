import { z } from "zod";

/**
 * Common validation schemas for reuse across the application
 */

// Email validation with custom error message
export const emailValidator = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

// Password validation with multiple rules
export const passwordValidator = z
  .string()
  .min(8, "Password does not meet requirements")
  .regex(/[A-Z]/, "Password does not meet requirements")
  .regex(/[a-z]/, "Password does not meet requirements")
  .regex(/[0-9]/, "Password does not meet requirements");

// Simple password for less strict requirements
export const simplePasswordValidator = z
  .string()
  .min(8, "Password must be at least 8 characters");

// Required string field
export const requiredString = (fieldName: string = "This field") =>
  z.string().min(1, `${fieldName} is required`);

// Optional string field
export const optionalString = z.string().optional();

// Phone number validation
export const phoneValidator = z
  .string()
  .regex(
    /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    "Please enter a valid phone number"
  );

// Name validation (letters, spaces, hyphens, apostrophes)
export const nameValidator = z
  .string()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters")
  .regex(/^[a-zA-Z\s\-']+$/, "Name can only contain letters, spaces, hyphens and apostrophes");

// Number validators
export const positiveNumber = z.number().positive("Must be a positive number");
export const percentageValidator = z.number().min(0, "Must be at least 0").max(100, "Must be at most 100");

// Date validators
export const futureDateValidator = z.date().refine(
  (date) => date > new Date(),
  "Date must be in the future"
);

export const pastDateValidator = z.date().refine(
  (date) => date < new Date(),
  "Date must be in the past"
);

export const minAgeValidator = (minAge: number) =>
  z.date().refine(
    (date) => {
      const today = new Date();
      const birthDate = new Date(date);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age >= minAge;
    },
    `Must be at least ${minAge} years old`
  );

// URL validation
export const urlValidator = z.string().url("Please enter a valid URL");

// File validation
export const imageFileValidator = z
  .instanceof(File)
  .refine(
    (file) => file.size <= 5 * 1024 * 1024,
    "File size must be less than 5MB"
  )
  .refine(
    (file) => ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type),
    "File must be a valid image (JPEG, PNG, or WebP)"
  );

// Checkbox/Boolean validators
export const mustBeTrue = (message: string = "This field must be checked") =>
  z.boolean().refine((val) => val === true, message);

// Common form schemas
export const signInSchema = z.object({
  email: emailValidator,
  password: requiredString("Password"),
  rememberMe: z.boolean().optional()
});

export const signUpSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  password: passwordValidator,
  kennel: optionalString,
  agreements: mustBeTrue("You must agree to the terms and conditions")
});

export const forgotPasswordSchema = z.object({
  email: emailValidator
});

export const resetPasswordSchema = z.object({
  password: passwordValidator,
  passwordConfirm: z.string()
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords do not match",
  path: ["passwordConfirm"]
});

// Helper function to create enum validator
export const createEnumValidator = <T extends string>(
  options: readonly T[],
  errorMessage: string = "Please select a valid option"
) => z.enum(options as [T, ...T[]], { errorMap: () => ({ message: errorMessage }) });

// Helper to make any validator optional
export const makeOptional = <T extends z.ZodTypeAny>(validator: T) =>
  validator.optional().or(z.literal(""));
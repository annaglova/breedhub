import { z } from 'zod';

// Common email schema
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

// Common password schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

// Sign In schema
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type SignInFormData = z.infer<typeof signInSchema>;

// Sign Up schema
export const signUpSchema = z.object({
  name: z.string().min(2, 'Please enter your full name'),
  email: emailSchema,
  password: passwordSchema,
  kennel: z.string().optional(),
  agreements: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms of service',
  }),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

// Forgot Password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset Password schema
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  passwordConfirm: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
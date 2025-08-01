import { z } from 'zod';
import {
  emailValidator,
  passwordValidator,
  nameValidator,
  requiredString,
  mustBeTrue
} from './validation';

// Sign In schema
export const signInSchema = z.object({
  email: emailValidator,
  password: requiredString('Password'),
  rememberMe: z.boolean().optional(),
});

export type SignInFormData = z.infer<typeof signInSchema>;

// Sign Up schema - using strong password validation
export const signUpSchema = z.object({
  email: emailValidator,
  password: passwordValidator,
  agreements: mustBeTrue('You must agree to the terms of service'),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

// Sign Up with Profile schema (for multi-step form)
export const signUpWithProfileSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  password: passwordValidator,
  kennelName: z.string().optional(),
  agreements: mustBeTrue('You must agree to the terms of service'),
});

export type SignUpWithProfileFormData = z.infer<typeof signUpWithProfileSchema>;

// Forgot Password schema
export const forgotPasswordSchema = z.object({
  email: emailValidator,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset Password schema
export const resetPasswordSchema = z.object({
  password: passwordValidator,
  passwordConfirm: requiredString('Password confirmation'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
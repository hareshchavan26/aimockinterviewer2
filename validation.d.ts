import { z } from 'zod';
export declare const userRegistrationSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    email: string;
    password: string;
    lastName: string;
}, {
    firstName: string;
    email: string;
    password: string;
    lastName: string;
}>;
export declare const userLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const passwordResetSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export declare const interviewConfigSchema: z.ZodObject<{
    industry: z.ZodString;
    role: z.ZodString;
    company: z.ZodString;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    questionTypes: z.ZodArray<z.ZodString, "many">;
    timeLimit: z.ZodNumber;
    interviewerPersonality: z.ZodEnum<["friendly", "neutral", "stress"]>;
}, "strip", z.ZodTypeAny, {
    industry: string;
    role: string;
    company: string;
    difficulty: "easy" | "medium" | "hard";
    questionTypes: string[];
    timeLimit: number;
    interviewerPersonality: "friendly" | "neutral" | "stress";
}, {
    industry: string;
    role: string;
    company: string;
    difficulty: "easy" | "medium" | "hard";
    questionTypes: string[];
    timeLimit: number;
    interviewerPersonality: "friendly" | "neutral" | "stress";
}>;
export declare const userResponseSchema: z.ZodObject<{
    questionId: z.ZodString;
    textResponse: z.ZodOptional<z.ZodString>;
    audioUrl: z.ZodOptional<z.ZodString>;
    videoUrl: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDate;
    duration: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    questionId: string;
    timestamp: Date;
    duration: number;
    textResponse?: string | undefined;
    audioUrl?: string | undefined;
    videoUrl?: string | undefined;
}, {
    questionId: string;
    timestamp: Date;
    duration: number;
    textResponse?: string | undefined;
    audioUrl?: string | undefined;
    videoUrl?: string | undefined;
}>;
export declare const subscriptionSchema: z.ZodObject<{
    planId: z.ZodString;
    paymentMethodId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    planId: string;
    paymentMethodId?: string | undefined;
}, {
    planId: string;
    paymentMethodId?: string | undefined;
}>;
export declare const validateEmail: (email: string) => boolean;
export declare const validatePassword: (password: string) => boolean;
export declare const validateUUID: (uuid: string) => boolean;
export declare const sanitizeString: (input: string) => string;
export declare const sanitizeEmail: (email: string) => string;
export declare class ValidationError extends Error {
    field?: string | undefined;
    code?: string | undefined;
    constructor(message: string, field?: string | undefined, code?: string | undefined);
}
export declare const handleValidationError: (error: z.ZodError) => ValidationError;

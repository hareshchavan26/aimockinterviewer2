import { z } from 'zod';
import { ValidationError } from '../types';

// Validation helper functions
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.')
      );
    }
    throw error;
  }
};

// Individual field validators
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateCurrency = (currency: string): boolean => {
  const validCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'];
  return validCurrencies.includes(currency.toLowerCase());
};

export const validatePrice = (price: number): boolean => {
  return price >= 0 && price <= 999999; // Max $9,999.99
};

export const validateUsageQuantity = (quantity: number): boolean => {
  return quantity > 0 && quantity <= 10000; // Reasonable upper limit
};

// Sanitization functions
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const sanitizeCurrency = (currency: string): string => {
  return currency.toLowerCase().trim();
};

// Custom validation error class
export class ValidationErrorWithDetails extends ValidationError {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationErrorWithDetails';
  }
}

// Batch validation helper
export const validateMultipleFields = (validations: Array<{ field: string; value: any; validator: (value: any) => boolean; message: string }>): void => {
  const errors: Array<{ field: string; message: string }> = [];
  
  validations.forEach(({ field, value, validator, message }) => {
    if (!validator(value)) {
      errors.push({ field, message });
    }
  });
  
  if (errors.length > 0) {
    throw new ValidationErrorWithDetails('Validation failed', errors);
  }
};
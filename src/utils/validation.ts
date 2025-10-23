/**
 * Validation utilities for IISBenin eLibrary
 * Provides robust validation for various input types
 */

/**
 * Validates ISBN-10 or ISBN-13 format
 * @param isbn - The ISBN string to validate
 * @returns true if valid ISBN-10 or ISBN-13
 */
export const validateISBN = (isbn: string): boolean => {
  if (!isbn) return false;
  
  const cleaned = isbn.replace(/[-\s]/g, '');
  if (!/^\d{10}(\d{3})?$/.test(cleaned)) return false;
  
  if (cleaned.length === 10) {
    // ISBN-10 validation
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i]) * (10 - i);
    }
    const check = cleaned[9] === 'X' ? 10 : parseInt(cleaned[9]);
    sum += check;
    return sum % 11 === 0;
  } else {
    // ISBN-13 validation
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleaned[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(cleaned[12]);
  }
};

/**
 * Validates email format
 * @param email - The email string to validate
 * @returns true if valid email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
};

/**
 * Validates Benin Republic phone number format
 * Accepts: +229XXXXXXXXXX or XXXXXXXXXX (8 digits after country code)
 * Example: +2290153077528 or 0153077528
 * @param phone - The phone number to validate
 * @returns true if valid Benin Republic phone format
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Benin numbers: +229 followed by 8 digits, or just 8 digits starting with 0
  return /^(\+?229)?[0-9]{8,10}$/.test(cleaned);
};

/**
 * Validates enrollment ID format for students or staff
 * Format: STU12345678 or STA12345678
 * @param id - The enrollment ID to validate
 * @param type - Either 'student' or 'staff'
 * @returns true if valid enrollment ID format
 */
export const validateEnrollmentID = (id: string, type: 'student' | 'staff'): boolean => {
  if (!id) return false;
  const prefix = type === 'student' ? 'STU' : 'STA';
  const regex = new RegExp(`^${prefix}\\d{8}$`, 'i');
  return regex.test(id.toUpperCase());
};

/**
 * Validates that a date string is a valid date
 * @param date - The date string to validate
 * @returns true if valid date
 */
export const validateDate = (date: string): boolean => {
  if (!date) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * Validates that a date is in the future
 * @param date - The date string to validate
 * @returns true if date is in the future
 */
export const validateFutureDate = (date: string): boolean => {
  if (!validateDate(date)) return false;
  return new Date(date) > new Date();
};

/**
 * Validates that a date is in the past
 * @param date - The date string to validate
 * @returns true if date is in the past
 */
export const validatePastDate = (date: string): boolean => {
  if (!validateDate(date)) return false;
  return new Date(date) < new Date();
};

/**
 * Validates password strength
 * Requirements: 10+ chars, uppercase, lowercase, number, special char
 * @param password - The password to validate
 * @returns Object with validation result and error message
 */
export const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 10) {
    return { valid: false, message: 'Password must be at least 10 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z)' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter (a-z)' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number (0-9)' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*)' };
  }
  return { valid: true, message: '' };
};

/**
 * Validates file size
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes (default 10MB)
 * @returns true if file size is within limit
 */
export const validateFileSize = (size: number, maxSize: number = 10485760): boolean => {
  return size > 0 && size <= maxSize;
};

/**
 * Validates file type
 * @param type - MIME type of the file
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if file type is allowed
 */
export const validateFileType = (type: string, allowedTypes: string[]): boolean => {
  return allowedTypes.some(allowed => type.startsWith(allowed));
};

/**
 * Formats file size to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Sanitizes string input to prevent XSS
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

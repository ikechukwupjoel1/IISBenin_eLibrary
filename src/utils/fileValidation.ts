// File validation utilities for secure file uploads

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const validateFileForUpload = (file: File): FileValidationResult => {
  // Allowed MIME types for educational materials
  const allowedMimeTypes = [
    'application/pdf',
    'application/epub+zip',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
  ];

  const allowedExtensions = [
    '.pdf',
    '.epub',
    '.ppt',
    '.pptx',
    '.doc',
    '.docx',
    '.mp4',
    '.webm',
    '.mp3',
    '.wav',
  ];

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type "${file.type}". Allowed types: PDF, EPUB, PowerPoint, Word, MP4, MP3, WAV`,
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const ext = fileName.match(/\.[^.]+$/)?.[0];
  
  if (!ext || !allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
    };
  }

  // Check for double extensions (e.g., file.pdf.exe)
  const parts = file.name.split('.');
  if (parts.length > 2) {
    return {
      valid: false,
      error: 'Files with multiple extensions are not allowed for security reasons',
    };
  }

  // Check for dangerous patterns in filename
  const dangerousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.sh$/i,
    /\.php$/i,
    /\.js$/i,
    /\.html$/i,
    /\.htm$/i,
    /<script/i,
    /javascript:/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(file.name)) {
      return {
        valid: false,
        error: 'File name contains potentially dangerous content',
      };
    }
  }

  // Check file size (50MB max)
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large! Maximum size is 50MB. Please compress the file.',
    };
  }

  // Check minimum file size (1KB) to prevent empty files
  const minSize = 1024; // 1KB
  if (file.size < minSize) {
    return {
      valid: false,
      error: 'File is too small or empty. Minimum size is 1KB.',
    };
  }

  return { valid: true };
};

export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Remove multiple consecutive dots
    .replace(/^\./, '') // Remove leading dot
    .slice(0, 100); // Limit length to 100 characters
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

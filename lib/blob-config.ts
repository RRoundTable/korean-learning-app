/**
 * Blob storage configuration utilities
 * Handles environment-specific blob token selection
 */

/**
 * Get the appropriate blob token based on NODE_ENV
 * Production uses PROD_READ_WRITE_TOKEN, others use BLOB_READ_WRITE_TOKEN
 */
export function getBlobToken(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    if (!process.env.PROD_READ_WRITE_TOKEN) {
      throw new Error('PROD_READ_WRITE_TOKEN is required in production environment');
    }
    return process.env.PROD_READ_WRITE_TOKEN;
  } else {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN is required in development environment');
    }
    return process.env.BLOB_READ_WRITE_TOKEN;
  }
}

/**
 * Check if blob token is available (for debugging/logging purposes)
 */
export function hasBlobToken(): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    return !!process.env.PROD_READ_WRITE_TOKEN;
  } else {
    return !!process.env.BLOB_READ_WRITE_TOKEN;
  }
}

/**
 * Get blob token prefix for debugging (first 20 characters)
 */
export function getBlobTokenPrefix(): string {
  const token = getBlobToken();
  return token.substring(0, 20) + '...';
}

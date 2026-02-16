import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'receipts';

export interface UploadResult {
  url: string;
  path: string;
}

export interface FileValidation {
  valid: boolean;
  error?: string;
}

// Validate file before upload
export function validateFile(
  file: { size: number; type: string },
  maxSizeMB: number = 10,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
): FileValidation {
  const maxSize = maxSizeMB * 1024 * 1024;

  if (file.size > maxSize) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed. Use JPEG, PNG, WebP, or PDF.' };
  }

  return { valid: true };
}

// Upload file to Supabase Storage
export async function uploadFile(
  businessId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<UploadResult | null> {
  try {
    // Create a unique path: businessId/timestamp-filename
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${businessId}/${timestamp}-${sanitizedFileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }

    // Get the public URL (or signed URL for private buckets)
    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

    return {
      url: urlData?.signedUrl || '',
      path: data.path,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

// Delete file from Supabase Storage
export async function deleteFile(
  businessId: string,
  filePath: string
): Promise<boolean> {
  try {
    // Verify the file belongs to this business (security check)
    if (!filePath.startsWith(`${businessId}/`)) {
      console.error('Unauthorized delete attempt');
      return false;
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}

// Get a signed URL for temporary access to a file
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Get signed URL error:', error);
    return null;
  }
}

// List files for a business
export async function listFiles(businessId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(businessId);

    if (error) {
      console.error('List files error:', error);
      return [];
    }

    return data.map((file) => `${businessId}/${file.name}`);
  } catch (error) {
    console.error('List files error:', error);
    return [];
  }
}

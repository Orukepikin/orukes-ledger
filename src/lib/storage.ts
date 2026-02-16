import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'receipts';

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export interface UploadResult {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export async function uploadFile(
  file: Buffer | Blob,
  fileName: string,
  businessId: string,
  contentType: string
): Promise<UploadResult> {
  if (!supabase) {
    // In development without Supabase, return a mock URL
    console.log('Storage not configured, returning mock URL');
    return {
      url: `/api/files/${businessId}/${fileName}`,
      fileName,
      fileType: contentType,
      fileSize: file instanceof Blob ? file.size : file.length,
    };
  }

  const filePath = `${businessId}/${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(storageBucket)
    .upload(filePath, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(storageBucket)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    fileName,
    fileType: contentType,
    fileSize: file instanceof Blob ? file.size : file.length,
  };
}

export async function deleteFile(fileUrl: string, businessId: string): Promise<boolean> {
  if (!supabase) {
    console.log('Storage not configured, skipping delete');
    return true;
  }

  // Extract file path from URL
  const urlParts = fileUrl.split('/');
  const bucketIndex = urlParts.indexOf(storageBucket);
  if (bucketIndex === -1) return false;

  const filePath = urlParts.slice(bucketIndex + 1).join('/');

  // Verify the file belongs to the business
  if (!filePath.startsWith(businessId)) {
    throw new Error('Unauthorized: Cannot delete file from another business');
  }

  const { error } = await supabase.storage
    .from(storageBucket)
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }

  return true;
}

export async function getSignedUrl(fileUrl: string, businessId: string): Promise<string> {
  if (!supabase) {
    return fileUrl;
  }

  const urlParts = fileUrl.split('/');
  const bucketIndex = urlParts.indexOf(storageBucket);
  if (bucketIndex === -1) return fileUrl;

  const filePath = urlParts.slice(bucketIndex + 1).join('/');

  // Verify the file belongs to the business
  if (!filePath.startsWith(businessId)) {
    throw new Error('Unauthorized: Cannot access file from another business');
  }

  const { data, error } = await supabase.storage
    .from(storageBucket)
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export function getAcceptedFileTypes(): string[] {
  return [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];
}

export function getMaxFileSize(): number {
  return 10 * 1024 * 1024; // 10MB
}

export function validateFile(file: { type: string; size: number }): { valid: boolean; error?: string } {
  const acceptedTypes = getAcceptedFileTypes();
  const maxSize = getMaxFileSize();

  if (!acceptedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

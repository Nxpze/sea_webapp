const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

let supabase;

function getSupabase() {
  if (!supabase) {
    const supaUrl = process.env.SUPA_URL;
    const supaKey = process.env.SUPA_SECRET_KEY;
    if (!supaUrl || !supaKey) {
      throw new Error('Supabase environment variables missing');
    }
    supabase = createClient(supaUrl, supaKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        transport: WebSocket
      }
    });
  }
  return supabase;
}

const BUCKET_NAME = 'payment-slips';
const SIGNED_URL_EXPIRES_IN = 300; // 300 seconds (5 minutes)

/**
 * Upload slip buffer to Supabase Storage private bucket
 */
async function uploadSlip(fileBuffer, originalFilename, mimeType, folder = 'slips') {
  const supa = getSupabase();
  
  // Validate MIME type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    throw new Error('ประเภทไฟล์ไม่ถูกต้อง (รองรับเฉพาะ JPG, PNG, PDF)');
  }

  // Validate size (max 5 MB)
  if (fileBuffer.length > 5 * 1024 * 1024) {
    throw new Error('ขนาดไฟล์เกิน 5 MB');
  }

  // Generate safe unique filename
  const ext = originalFilename.split('.').pop().toLowerCase();
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const filePath = `${folder}/${timestamp}_${randomStr}.${ext}`;

  const { data, error } = await supa.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    throw new Error(`Upload slip failed: ${error.message}`);
  }

  return filePath;
}

/**
 * Generate a short-lived Signed URL for viewing a slip
 */
async function getSignedSlipUrl(storagePath) {
  if (!storagePath) return null;
  // If it's already a full external URL, return as is (fallback for legacy data)
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }

  const supa = getSupabase();
  const { data, error } = await supa.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN);

  if (error) {
    console.error('Failed to create signed URL:', error.message);
    return null;
  }

  return data.signedUrl;
}

module.exports = {
  uploadSlip,
  getSignedSlipUrl,
  BUCKET_NAME
};

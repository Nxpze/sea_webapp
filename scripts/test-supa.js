require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

async function testSupabase() {
  console.log('Testing Supabase Storage connection...');
  const supaUrl = process.env.SUPA_URL;
  const supaSecret = process.env.SUPA_SECRET_KEY;

  if (!supaUrl || !supaSecret) {
    console.error('Error: SUPA_URL or SUPA_SECRET_KEY is missing in environment variables.');
    process.exit(1);
  }

  try {
    const supabase = createClient(supaUrl, supaSecret, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        transport: WebSocket
      }
    });
    
    // Check buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      throw listError;
    }

    console.log('Available Supabase Storage buckets:', buckets.map(b => ({ name: b.name, public: b.public })));

    const slipBucket = buckets.find(b => b.name === 'payment-slips');
    if (!slipBucket) {
      console.warn('Warning: Bucket "payment-slips" not found in Supabase storage.');
    } else {
      console.log(`Bucket "payment-slips" verified. Is public: ${slipBucket.public} (Expected: false)`);
    }

    console.log('Supabase connection test passed!');
  } catch (err) {
    console.error('Supabase connection test failed:', err.message);
    process.exit(1);
  }
}

testSupabase();

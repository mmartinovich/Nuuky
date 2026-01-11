#!/usr/bin/env node

/**
 * Migration Runner for room_invites table
 *
 * Usage:
 *   SUPABASE_URL=your_url SUPABASE_SERVICE_KEY=your_service_key node run-migration.js
 *
 * Or add to package.json scripts:
 *   "migrate": "node run-migration.js"
 */

const fs = require('fs');
const path = require('path');

// Get credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('');
  console.error('Set environment variables:');
  console.error('  SUPABASE_URL=your_project_url');
  console.error('  SUPABASE_SERVICE_KEY=your_service_role_key');
  console.error('');
  console.error('Get your service key from: https://supabase.com/dashboard/project/_/settings/api');
  process.exit(1);
}

// Read migration file
const migrationPath = path.join(__dirname, 'nooke/supabase/migrations/create_room_invites.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Running room_invites migration...');
console.log('');

// Execute migration
fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  },
  body: JSON.stringify({ query: migrationSQL })
})
.then(response => {
  if (!response.ok) {
    return response.text().then(text => {
      throw new Error(`HTTP ${response.status}: ${text}`);
    });
  }
  return response.json();
})
.then(data => {
  console.log('✅ Migration completed successfully!');
  console.log('');
  console.log('Created:');
  console.log('  - room_invites table');
  console.log('  - 4 indexes for performance');
  console.log('  - 4 RLS policies');
  console.log('  - expire_old_invites() function');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Verify tables in Supabase dashboard');
  console.log('  2. Test invite functionality in the app');
})
.catch(error => {
  console.error('❌ Migration failed:', error.message);
  console.error('');
  console.error('Try running the SQL manually in Supabase SQL Editor:');
  console.error(`  ${migrationPath}`);
  process.exit(1);
});

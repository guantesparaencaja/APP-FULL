import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envLocalPath = './.env.local';
const envContent = fs.readFileSync(envLocalPath, 'utf8');

const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

console.log('URL:', supabaseUrl);
console.log('Anon Key length:', supabaseAnonKey?.length);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('\n--- Testing "profiles" table select ---');
  const { data: profiles, error: errProfiles } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  if (errProfiles) {
    console.error('Error on profiles:', errProfiles.message);
  } else {
    console.log('Profiles table exists! Sample data keys:', Object.keys(profiles[0] || {}));
  }

  console.log('\n--- Testing "users" table select ---');
  const { data: users, error: errUsers } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  if (errUsers) {
    console.error('Error on users:', errUsers.message);
  } else {
    console.log('Users table exists! Sample data keys:', Object.keys(users[0] || {}));
  }
}

test();

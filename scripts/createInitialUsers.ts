import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

interface UserInfo {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'organizer';
}

const users: UserInfo[] = [
  {
    email: 'admin@sahmtickethub.com',
    password: 'AdminPass123',
    full_name: 'Admin User',
    phone: '08000000000',
    role: 'admin',
  },
  {
    email: 'organizer@sahmtickethub.com',
    password: 'OrganizerPass123',
    full_name: 'Organizer User',
    phone: '08111111111',
    role: 'organizer',
  },
];

async function createUser(user: UserInfo) {
  try {
    // Check if user exists by listing users
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = usersList.users.find(u => u.email === user.email);
    let userId = existingUser?.id;

    if (!userId) {
  // Create user if it doesn't exist
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { role: user.role, full_name: user.full_name },
  });
  if (error) throw error;

  // Access id correctly
  userId = data.user.id;
  console.log(`Created user: ${user.email}`);
} else {
  console.log(`User already exists: ${user.email}`);
}

    // Upsert profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
      });

    if (profileError) throw profileError;
    console.log(`Profile upserted for: ${user.email}`);
  } catch (err: any) {
    console.error(`Error creating user ${user.email}:`, err.message || err);
  }
}

async function main() {
  for (const user of users) {
    await createUser(user);
  }
  console.log('Done creating initial users.');
}

main();

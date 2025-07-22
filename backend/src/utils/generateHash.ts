import bcrypt from 'bcryptjs';

// Script to generate bcrypt hashes for seed data
const generateHash = async (password: string): Promise<void> => {
  const hash = await bcrypt.hash(password, 10);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('---');
};

// Generate hashes for default passwords
const run = async () => {
  await generateHash('password123');
  await generateHash('admin123');
  await generateHash('operator123');
};

run();
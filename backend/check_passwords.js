const bcrypt = require('bcryptjs');

// The password hashes from the seed file
const users = [
  {
    username: 'swift_admin',
    hash: '$2b$10$9k7uW84hqN9xhyP5xNYG2eOttPTJujyKr29giJKDNr6TjjOF.f.Iu'
  },
  {
    username: 'swift_ops',
    hash: '$2b$10$biVEdCZ3BEgDdtr301bx4u.VTR9Lywk1Fs4ogudsDMajD49I3WGVK'
  },
  {
    username: 'swift_mumbai',
    hash: '$2b$10$5MrOQGZy8m.dHX7JEkMn/uNHRphxPiFw4gLTYZVdf0WCIWNBIzYvm'
  }
];

// Test different passwords
const passwords = ['admin123', 'password123', 'Admin@123', 'Pass@123', 'operator123', 'mumbai123', 'swift123'];

console.log('Testing password hashes...\n');

users.forEach(user => {
  console.log(`Testing ${user.username}:`);
  passwords.forEach(password => {
    const isMatch = bcrypt.compareSync(password, user.hash);
    if (isMatch) {
      console.log(`  ✅ Password is: ${password}`);
    }
  });
  console.log('');
});
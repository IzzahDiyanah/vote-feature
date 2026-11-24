// run the real migrations on the test db before the tests
const { execSync } = require('child_process');

module.exports = async () => {
  if (process.env.SKIP_MIGRATE === '1') return;
  const url =
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5433/featurevote_test';
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
};

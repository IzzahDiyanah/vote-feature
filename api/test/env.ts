// Runs before every test file. Points the app at the TEST database.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/featurevote_test';
process.env.JWT_SECRET = 'test-secret-test-secret-123';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.BCRYPT_ROUNDS = '4'; // fast hashing in tests only

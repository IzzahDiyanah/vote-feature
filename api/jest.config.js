/** Tests run against a real Postgres db, not mocks, since the vote/lock rules live in the database. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: 'test/.*\\.spec\\.ts$',
  setupFiles: ['<rootDir>/test/env.ts'],
  globalSetup: '<rootDir>/test/global-setup.js',
  testTimeout: 30000,
};

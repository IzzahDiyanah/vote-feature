/** Tests run against a REAL Postgres database (not mocks), because the rules we care
 *  about (unique votes, row locks, transactions) live in the database. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: 'test/.*\\.spec\\.ts$',
  setupFiles: ['<rootDir>/test/env.ts'],
  globalSetup: '<rootDir>/test/global-setup.js',
  testTimeout: 30000,
};

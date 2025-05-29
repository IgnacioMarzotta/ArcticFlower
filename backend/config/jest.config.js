module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['../**/tests/**/*.spec.ts'],
  setupFilesAfterEnv: ['../tests/jest.setup.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
};
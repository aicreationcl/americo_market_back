/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },
  setupFiles: ['<rootDir>/src/tests/env.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testMatch: ['<rootDir>/src/tests/**/*.test.ts'],
  testTimeout: 30000,
  verbose: true,
}

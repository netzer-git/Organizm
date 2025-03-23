/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }]
  },
  // Configure specific test environments based on test path
  testEnvironmentOptions: {
    // Options for the `node` environment
  },
  // Override test environment for UI tests
  projects: [
    {
      displayName: 'ui-tests',
      testMatch: ['<rootDir>/tests/ui/**/*.test.ts'],
      testEnvironment: 'jsdom',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }]
      }
    },
    {
      displayName: 'core-tests',
      testMatch: ['<rootDir>/tests/core/**/*.test.ts', '<rootDir>/tests/utils/**/*.test.ts', '<rootDir>/tests/simulation/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }]
      }
    }
  ]
};
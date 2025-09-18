module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/core'],
  testMatch: ['**/test/**/*.test.ts'],
  moduleNameMapper: {
    '^@awale/core/(.*)$': '<rootDir>/packages/core/src/$1',
    '^@awale/(.*)$': '<rootDir>/packages/$1/src'
  },
  collectCoverageFrom: ['packages/core/src/**/*.ts'],
  modulePathIgnorePatterns: ['<rootDir>/packages/bot'],
};

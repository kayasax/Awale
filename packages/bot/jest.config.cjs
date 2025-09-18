module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleFileExtensions: ['ts','js','json'],
  testMatch: ['**/test/**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.cjs']
};

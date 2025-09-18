const fs = require('fs');
const path = require('path');

module.exports = (request, options) => {
  // Use Jest's default resolver
  return options.defaultResolver(request, {
    ...options,
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.node'],
  });
};
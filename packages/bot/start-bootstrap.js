// Bootstrap starter that attempts to run compiled TS server, falling back to simple-server
const fs = require('fs');
const path = require('path');

const primary = path.join(__dirname, 'dist', 'bot', 'src', 'server.js');
const fallback = path.join(__dirname, 'simple-server.js');

function log(msg){
  console.log(`[bootstrap] ${msg}`);
}

log('Starting bot process...');
log(`Node version: ${process.version}`);
log(`CWD: ${process.cwd()}`);
log(`Primary expected: ${primary}`);

if (fs.existsSync(primary)) {
  log('Primary server found. Launching.');
  try {
    require(primary);
  } catch(err) {
    log('Primary server crashed during require: ' + err.stack);
    if (fs.existsSync(fallback)) {
      log('Launching fallback simple-server.');
      require(fallback);
    } else {
      log('Fallback server missing. Exiting.');
      process.exit(1);
    }
  }
} else {
  log('Primary server missing; using fallback simple-server.');
  if (fs.existsSync(fallback)) {
    require(fallback);
  } else {
    log('Fallback server also missing. Exiting.');
    process.exit(1);
  }
}

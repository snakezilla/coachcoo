#!/usr/bin/env node
/* eslint-env node */

const fs = require('fs');
const path = require('path');

const sqliteDir = path.join(__dirname, '..', 'SQLite');
const targets = ['coachcoo.db', 'coachcoo.db-shm', 'coachcoo.db-wal'].map((name) =>
  path.join(sqliteDir, name)
);

let removed = 0;
for (const file of targets) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    removed += 1;
  }
}

if (removed === 0) {
  console.log('No local SQLite snapshots found. If you ran on a device, use in-app wipe.');
} else {
  console.log(`Removed ${removed} local SQLite snapshot${removed === 1 ? '' : 's'}.`);
}

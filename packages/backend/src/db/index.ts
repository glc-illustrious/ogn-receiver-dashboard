import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config.js';
import { createTables } from './schema.js';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(dirname(config.db.path), { recursive: true });
    db = new Database(config.db.path);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    createTables(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}

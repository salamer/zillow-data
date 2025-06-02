// This script initializes the database by creating the schema and synchronizing the tables

import config from './config';
import { AppDataSource, schema, House, User } from './models';
import { hashPassword } from './utils';

export async function initializeDatabase() {
  console.log('Initializing database...');
  // connect to the database
  await AppDataSource.initialize();

  // create schema if it doesn't exist
  console.log(`Creating schema: ${schema}`);
  await AppDataSource.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

  // synchronize the database schema
  // This will create the tables if they don't exist
  console.log('Synchronizing database schema...');
  await AppDataSource.synchronize();

  // create gin index for houses table
  // use for full-text search on the caption column
  await AppDataSource.query(`
        CREATE INDEX IF NOT EXISTS zillow_posts_search_vector_idx
        ON ${schema}.houses USING gin (to_tsvector('english', address));
    `);

  // only for development purposes
  const repo = AppDataSource.getRepository(User);
  const adminUser = repo.create({
    username: config.ADMIN_USERNAME,
    email: 'admin@admin.org',
    passwordHash: await hashPassword('admin123'),
    id: config.ADMIN_USER_ID, // Set a fixed ID for the admin user
  });
  await repo.save(adminUser);

  const guestUser = repo.create({
    username: config.GUEST_USERNAME,
    email: 'guest@guest.org',
    passwordHash: await hashPassword('guest123'),
    id: config.GUEST_USER_ID, // Set a fixed ID for the guest user
  });
  await repo.save(guestUser);
}
// This function will be called when the script is run
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error initializing database:', error);
    process.exit(1);
  });

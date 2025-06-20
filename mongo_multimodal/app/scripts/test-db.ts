import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { getDb } from '../lib/mongodb';
import { userSchema } from '../lib/validations';

async function testDbConnection() {
  try {
    console.log('Testing MongoDB connection...');
    const db = await getDb();

    // Test ping
    await db.command({ ping: 1 });
    console.log('MongoDB connection successful!');

    // Create collections with validation
    try {
      await db.createCollection('users', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['email', 'name'],
            properties: {
              email: {
                bsonType: 'string',
                pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
              },
              name: {
                bsonType: 'string',
                minLength: 2,
                maxLength: 100
              },
              projects: {
                bsonType: 'array',
                items: {
                  bsonType: 'objectId'
                }
              }
            }
          }
        }
      });
      console.log('Users collection created with validation');
    } catch {
      console.log('Users collection already exists');
    }

    // Create indexes
    const collections = await db.collections();
    if (collections.find(c => c.collectionName === 'users')) {
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      console.log('User indexes created');
    }

    // Test user creation
    const testUser = {
      email: 'test@example.com',
      name: 'Test User',
      projects: []
    };

    userSchema.parse(testUser);
    console.log('User validation successful');

    // Clean up test data
    await db.collection('users').deleteOne({ email: 'test@example.com' });

    console.log('All tests passed!');
  } catch (error) {
    console.error('Database test failed:', error);
    process.exit(1);
  }
}

testDbConnection()
  .catch(console.error)
  .finally(() => process.exit());

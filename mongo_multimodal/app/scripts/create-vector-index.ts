import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { getDb } from '../lib/mongodb';

async function createVectorIndex() {
  try {
    console.log('Creating vector search index...');

    const db = await getDb();

    // Get the projectData collection
    const collection = db.collection('projectData');

    // Define the vector search index
    const indexDefinition = {
      name: 'vector_index',
      definition: {
        mappings: {
          dynamic: true,
          fields: {
            embedding: {
              type: 'knnVector',
              dimensions: 1024,
              similarity: 'cosine'
            }
          }
        }
      }
    };

    try {
      // Check if index already exists
      const indexes = await collection.listSearchIndexes().toArray();
      const existingIndex = indexes.find(idx => idx.name === 'vector_index');

      if (existingIndex) {
        console.log('Vector index already exists:', existingIndex.name);
        console.log('Index definition:', JSON.stringify(existingIndex, null, 2));
        return;
      }

      // Create the search index
      console.log('Creating new vector index...');
      await collection.createSearchIndex(indexDefinition);

      console.log('Vector search index created successfully!');
      console.log('Index name: vector_index');
      console.log('Collection: projectData');
      console.log('Dimensions: 1024');
      console.log('Similarity: cosine');

      console.log('\nNote: It may take a few minutes for the index to be fully active.');
      console.log('You can check the index status in MongoDB Atlas UI.');

    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === 'IndexAlreadyExists' || err?.message?.includes('already exists')) {
        console.log('Vector index already exists');
      } else {
        throw error;
      }
    }

    // Also ensure regular indexes exist
    console.log('\nCreating regular indexes...');

    // Create compound index for projectId queries
    await collection.createIndex({ projectId: 1, createdAt: -1 });
    console.log('Created index on projectId and createdAt');

    // Create index for processedAt to find unprocessed items
    await collection.createIndex({ processedAt: 1 });
    console.log('Created index on processedAt');

    // Create index for type field
    await collection.createIndex({ type: 1 });
    console.log('Created index on type');

    // For projects collection
    const projectsCollection = db.collection('projects');
    await projectsCollection.createIndex({ createdAt: -1 });
    console.log('Created index on projects.createdAt');

    console.log('\nAll indexes created successfully!');

  } catch (error) {
    console.error('Failed to create vector index:', error);
    console.error('\nTroubleshooting tips:');
    console.error('1. Ensure your MongoDB Atlas cluster is M10 or higher (required for vector search)');
    console.error('2. Check that your connection string has proper permissions');
    console.error('3. Verify that the database and collection names are correct');
    console.error('4. You may need to create the index manually in Atlas UI if this script fails');
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createVectorIndex();
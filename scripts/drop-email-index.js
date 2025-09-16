import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './config.env' });

async function dropEmailIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // List all indexes
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the email index if it exists
    try {
      await usersCollection.dropIndex('email_1');
      console.log('✅ Successfully dropped email_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  email_1 index does not exist');
      } else {
        console.error('❌ Error dropping email_1 index:', error.message);
      }
    }

    // List indexes again to confirm
    const updatedIndexes = await usersCollection.indexes();
    console.log('Updated indexes:', updatedIndexes);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

dropEmailIndex();

import { MongoClient } from 'mongodb';

let db;

const connectToDb = async () => {
  // Use MongoDB Atlas connection string
  const url = process.env.MONGODB_URI;
  const dbName = 'mbtiApp'; // Database name

  try {
    const client = await MongoClient.connect(url);
    console.log('Connected successfully to MongoDB Atlas');
    db = client.db(dbName); // Set the database instance
  } catch (err) {
    console.error('Failed to connect to the database:', err);
    throw err; // Propagate the error back to the caller
  }
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDb first.');
  }
  return db;
};

export { connectToDb, getDb };

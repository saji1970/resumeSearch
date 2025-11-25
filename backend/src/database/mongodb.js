const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobsearch';
const client = new MongoClient(uri);

let db;

async function connect() {
  try {
    await client.connect();
    db = client.db('jobsearch');
    console.log('MongoDB connected successfully');
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

function getDb() {
  if (!db) {
    throw new Error('MongoDB not connected. Call connect() first.');
  }
  return db;
}

module.exports = { connect, getDb, client };


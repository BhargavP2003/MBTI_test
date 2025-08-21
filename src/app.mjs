
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { getDb, connectToDb } from './db.js';
import { compatibilityData } from './config.js';

const app = express();
app.use(express.json());
app.use(cors());

connectToDb().then(() => {
  app.listen(3000, () => {
    console.log('App listening on port 3000');
  });
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});

app.get('/', (req, res) => {
  res.status(200).send({ msg: 'Welcome to the MBTI Personality Test' });
});

// Start the test: returns userId and questions
app.post('/test/start', async (req, res) => {
  try {
    const db = getDb();
    const newUserId = uuidv4();
    // Get 10 random questions
    const questionDocs = await db.collection('questions').aggregate([{ $sample: { size: 10 } }]).toArray();
    const questions = questionDocs.map((doc, i) => {
      const category = Object.keys(doc).find(key => key !== '_id');
      const question = doc[category][0];
      return {
        number: i + 1,
        category,
        question: question.question,
        options: [question.optionA, question.optionB],
        scoreA: question.scoreA,
        scoreB: question.scoreB
      };
    });
    // Save user state
    await db.collection('userStates').insertOne({
      userId: newUserId,
      scores: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
      currentQuestionIndex: 0,
      selectedQuestions: questions,
      previousAnswers: [],
      testStarted: true
    });
    res.status(200).json({ userId: newUserId, questions });
  } catch (err) {
    console.error('Error starting test:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Submit answers and get result
app.post('/test/submit', async (req, res) => {
  const { userId, answers } = req.body;
  try {
    const db = getDb();
    const userState = await db.collection('userStates').findOne({ userId });
    if (!userState || !userState.testStarted) {
      return res.status(400).json({ error: 'Invalid user ID or test not started.' });
    }
    // Calculate scores
    const typeOrder = [
      ["E", "I"],
      ["S", "N"],
      ["T", "F"],
      ["J", "P"]
    ];
    const answerMap = {
      A: { E: 1, I: 0, S: 1, N: 0, T: 1, F: 0, J: 1, P: 0 },
      B: { E: 0, I: 1, S: 0, N: 1, T: 0, F: 1, J: 0, P: 1 }
    };
    let scores = { ...userState.scores };
    answers.forEach((a, idx) => {
      const ans = a.toUpperCase();
      for (let key in scores) {
        scores[key] += answerMap[ans][key];
      }
    });
    const personalityType = typeOrder.map(pair => scores[pair[0]] >= scores[pair[1]] ? pair[0] : pair[1]).join('');
    const compatibleTypes = compatibilityData[personalityType] || [];
    await db.collection('users').insertOne({ userId, answers, personalityType, compatibleTypes });
    await db.collection('userStates').deleteOne({ userId });
    res.status(201).json({ type: personalityType, compatibleTypes });
  } catch (err) {
    console.error('Error submitting answers:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default app;

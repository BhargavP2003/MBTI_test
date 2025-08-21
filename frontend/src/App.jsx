

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [messages, setMessages] = useState([
    { text: '👋 Hi! Welcome to the MBTI Test. Would you like to start?', from: 'bot' },
  ]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState('greet');
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [userId, setUserId] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (text, from = 'user') => {
    setMessages((msgs) => [...msgs, { text, from }]);
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3000/test/start');
      setUserId(res.data.userId);
      setQuestions(res.data.questions);
      setStep('question');
      setCurrent(0);
      sendMessage('Great! Let’s begin.', 'bot');
      setTimeout(() => {
        sendMessage(res.data.questions[0].question, 'bot');
      }, 500);
    } catch (err) {
      sendMessage('Error connecting to backend.', 'bot');
    }
    setLoading(false);
  };

  const handleAnswer = async (option, optionLetter) => {
    sendMessage(option, 'user');
    setAnswers((a) => [...a, optionLetter]);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setTimeout(() => {
        sendMessage(questions[current + 1].question, 'bot');
      }, 500);
    } else {
      setStep('result');
      setLoading(true);
      try {
        const res = await axios.post('http://localhost:3000/test/submit', {
          userId,
          answers: [...answers, optionLetter],
        });
        setResult(res.data);
        sendMessage(`Your MBTI type is ${res.data.type}. Compatible types: ${res.data.compatibleTypes.join(', ')}`, 'bot');
      } catch (err) {
        sendMessage('Error submitting answers.', 'bot');
      }
      setLoading(false);
    }
  };

  const handleInput = (e) => setInput(e.target.value);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input, 'user');
    if (step === 'greet' && input.toLowerCase().includes('yes')) {
      handleStart();
    } else if (step === 'greet') {
      sendMessage('Type "yes" to start the test.', 'bot');
    }
    setInput('');
  };

  return (
    <div className="mbti-chat-root">
  <h2 className="mbti-chat-title">Discover Your MBTI Personality! 🧠✨</h2>
      <div ref={chatRef} className="mbti-chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`mbti-chat-row ${msg.from === 'user' ? 'mbti-chat-user' : 'mbti-chat-bot'}`}>
            <div className="mbti-chat-bubble">{msg.text}</div>
          </div>
        ))}
      </div>
      {step === 'greet' && (
        <div className="mbti-chat-input-row">
          <input
            placeholder="Type 'yes' to start..."
            value={input}
            onChange={handleInput}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={loading}
            className="mbti-chat-input"
          />
          <button onClick={handleSend} disabled={loading} className="mbti-chat-send">Send</button>
        </div>
      )}
      {step === 'question' && questions[current] && (
        <div className="mbti-chat-options-row">
          <button onClick={() => handleAnswer(questions[current].options[0], 'A')} disabled={loading} className="mbti-chat-option">{questions[current].options[0]}</button>
          <button onClick={() => handleAnswer(questions[current].options[1], 'B')} disabled={loading} className="mbti-chat-option">{questions[current].options[1]}</button>
        </div>
      )}
      {step === 'result' && result && (
        <div className="mbti-chat-result">
          <h3>Your MBTI type: {result.type}</h3>
          <p>Compatible types: {result.compatibleTypes.join(', ')}</p>
        </div>
      )}
    </div>
  );
}

export default App;

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async () => {
  const { data } = await api.get('/health');
  return data;
};

export const submitGoal = async (userEmail: string, goalText: string, modality: string = 'project') => {
  const { data } = await api.post('/goal', {
    user_email: userEmail,
    goal_text: goalText,
    preferred_modality: modality
  });
  return data;
};

export const submitDiagnostic = async (sessionId: number, questionId: string, answer: string) => {
  const { data } = await api.post('/diagnostic/submit', {
    session_id: sessionId,
    question_id: questionId,
    answer: answer
  });
  return data;
};

export const simulateSkip = async (profileId: number, skillId: string) => {
  const { data } = await api.post('/path/skip', {
    profile_id: profileId,
    skill_id: skillId
  });
  return data;
};

export const getCheckpointQuestion = async (skillId: string) => {
  const { data } = await api.get(`/checkpoint/${skillId}`);
  return data;
};

export const submitCheckpoint = async (profileId: number, skillId: string, userAnswer: string) => {
  const { data } = await api.post('/checkpoint/submit', {
    profile_id: profileId,
    skill_id: skillId,
    user_answer: userAnswer
  });
  return data;
};

export const sendCoachMessage = async (skillId: string, message: string) => {
  const { data } = await api.post('/coach/chat', {
    skill_id: skillId,
    message: message
  });
  return data;
};

export default api;

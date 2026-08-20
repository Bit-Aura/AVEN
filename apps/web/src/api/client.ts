import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async () => {
  const { data } = await api.get('/health');
  return data;
};

// TODO: Add more typed API functions
export default api;

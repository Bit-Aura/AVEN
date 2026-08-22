import axios from 'axios';
import { paths } from 'shared-types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Extract types directly from generated OpenAPI definitions
type HealthResponse = paths['/health']['get']['responses'][200]['content']['application/json'];

export const getHealth = async (): Promise<HealthResponse> => {
  const { data } = await api.get<HealthResponse>('/health');
  return data;
};

export default api;

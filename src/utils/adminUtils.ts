// Constants
import { API_BASE_URL } from '../config';
export { API_BASE_URL };
export const STORAGE_KEY = 'admin_auth_token';

// Utility functions
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem(STORAGE_KEY);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
};

// Titles often list several numbers ("(1°) - 30/34 ; (2°) - 38/41"). When
// searching a bare number, rank by the smallest number that actually
// contains the searched digits, so searching "5" orders 5, 15, 25… ahead of
// unrelated numbers in the same title. Numbers followed by "°" (angles like
// 45°, set markers like (2°)) are ignored.
export const numberMatchScore = (title: string, searchDigits: string): number => {
  const numbers = title.match(/\d+(?![\d°])/g) || [];
  const matching = numbers.filter((n) => n.includes(searchDigits)).map(Number);
  return matching.length ? Math.min(...matching) : Infinity;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
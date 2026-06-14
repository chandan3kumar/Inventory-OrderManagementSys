// API Base URL config. 
// Uses the environment variable if available, otherwise defaults to localhost:8000.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

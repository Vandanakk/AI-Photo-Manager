import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Accept': 'application/json',
  },
});

export const getPhotoFileUrl = (photoId: string): string => {
  return `${API_BASE_URL}/api/v1/photos/${photoId}/file`;
};

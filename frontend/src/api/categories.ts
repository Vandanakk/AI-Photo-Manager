import { apiClient } from './client';
import type { CategoriesResponse } from '../types';

export const getCategories = async (): Promise<CategoriesResponse> => {
  const response = await apiClient.get<CategoriesResponse>('/categories/');
  return response.data;
};

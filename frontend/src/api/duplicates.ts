import { apiClient } from './client';
import type { DuplicateGroupsResponse, DuplicateStats } from '../types';

export const getDuplicateGroups = async (
  skip: number = 0,
  limit: number = 50
): Promise<DuplicateGroupsResponse> => {
  const response = await apiClient.get<DuplicateGroupsResponse>('/duplicates/', {
    params: { skip, limit },
  });
  return response.data;
};

export const getDuplicateStats = async (): Promise<DuplicateStats> => {
  const response = await apiClient.get<DuplicateStats>('/duplicates/stats');
  return response.data;
};

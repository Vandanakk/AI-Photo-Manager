import { apiClient } from './client';
import type { SearchResponse, SuggestionsResponse } from '../types';

export const searchPhotos = async (
  query: string,
  limit: number = 20,
  skip: number = 0
): Promise<SearchResponse> => {
  const response = await apiClient.get<SearchResponse>('/search/', {
    params: { q: query, limit, skip },
  });
  return response.data;
};

export const getSearchSuggestions = async (query: string): Promise<SuggestionsResponse> => {
  const response = await apiClient.get<SuggestionsResponse>('/search/suggestions', {
    params: { q: query },
  });
  return response.data;
};

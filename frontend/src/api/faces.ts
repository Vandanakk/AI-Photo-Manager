import { apiClient } from './client';
import type { PersonsResponse } from '../types';

export const getPersons = async (skip: number = 0, limit: number = 50): Promise<PersonsResponse> => {
  const response = await apiClient.get<PersonsResponse>('/faces/', {
    params: { skip, limit },
  });
  return response.data;
};

export const updatePersonName = async (
  personId: string,
  name: string
): Promise<{ person_id: string; name: string; message: string }> => {
  const response = await apiClient.patch<{ person_id: string; name: string; message: string }>(
    `/faces/${personId}/name`,
    null,
    {
      params: { name },
    }
  );
  return response.data;
};

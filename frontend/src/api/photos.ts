import { apiClient } from './client';
import type { PhotoListResponse, PhotoDetail, UploadResult, BatchUploadResponse } from '../types';

export interface GetPhotosParams {
  category?: string;
  skip?: number;
  limit?: number;
  include_duplicates?: boolean;
}

export const getPhotos = async (params?: GetPhotosParams): Promise<PhotoListResponse> => {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params?.category && params.category !== 'all') {
    queryParams.category = params.category;
  }
  if (params?.skip !== undefined) queryParams.skip = params.skip;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  if (params?.include_duplicates !== undefined) queryParams.include_duplicates = params.include_duplicates;

  const response = await apiClient.get<PhotoListResponse>('/photos/', {
    params: queryParams,
  });
  return response.data;
};

export const getPhotoById = async (photoId: string): Promise<PhotoDetail> => {
  const response = await apiClient.get<PhotoDetail>(`/photos/${photoId}`);
  return response.data;
};

export const uploadPhoto = async (
  file: File,
  onUploadProgress?: (progress: number) => void
): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<UploadResult>('/photos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onUploadProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      }
    },
  });
  return response.data;
};

export const uploadBatchPhotos = async (
  files: File[],
  onUploadProgress?: (progress: number) => void
): Promise<BatchUploadResponse> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await apiClient.post<BatchUploadResponse>('/photos/upload/batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onUploadProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      }
    },
  });
  return response.data;
};

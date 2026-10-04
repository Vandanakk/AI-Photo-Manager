export type NavigationTab = 'photos' | 'search' | 'people' | 'duplicates' | 'categories';

export interface PhotoSummary {
  id: string;
  filename: string;
  category: string;
  taken_at: string | null;
  width: number | null;
  height: number | null;
  is_duplicate: boolean;
  tags: string[];
}

export interface PhotoListResponse {
  total: number;
  skip: number;
  limit: number;
  photos: PhotoSummary[];
}

export interface PhotoDetail {
  id: string;
  filename: string;
  source: string;
  category: string;
  category_confidence: number;
  caption: string | null;
  tags: string[];
  width: number | null;
  height: number | null;
  file_size: number | null;
  taken_at: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
  md5_hash: string | null;
}

export interface UploadResult {
  photo_id: string;
  filename: string;
  category: string;
  is_duplicate: boolean;
  duplicate_of?: string | null;
  is_processed: boolean;
}

export interface BatchUploadResponse {
  uploaded: number;
  results: UploadResult[];
}

export interface SearchResultItem {
  photo_id: string;
  filename: string;
  score: number;
  category: string;
  caption: string | null;
  tags: string[];
  taken_at: string | null;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResultItem[];
}

export interface SuggestionsResponse {
  query: string;
  suggestions: string[];
}

export interface DuplicateItem {
  id: string;
  filename: string;
  type: 'exact' | 'near';
}

export interface DuplicateGroup {
  original_id: string;
  original_filename: string;
  duplicate_count: number;
  duplicates: DuplicateItem[];
}

export interface DuplicateGroupsResponse {
  total_groups: number;
  groups: DuplicateGroup[];
}

export interface DuplicateStats {
  total_photos: number;
  duplicate_photos: number;
  unique_photos: number;
  duplicate_percentage: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface CategoriesResponse {
  categories: CategoryCount[];
}

export interface Person {
  person_id: string;
  name: string | null;
  photo_count: number;
  sample_photo_ids: string[];
}

export interface PersonsResponse {
  total: number;
  persons: Person[];
}

export interface HealthStatus {
  status: string;
  database: string;
  version: string;
}

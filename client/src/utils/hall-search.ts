export type HallSearchState = {
  keyword?: string;
  style?: string;
  species?: string[];
  tags?: string[];
  province?: string;
  city?: string;
};

export const HALL_SEARCH_DRAFT_STORAGE_KEY = 'hall:search-draft';
export const HALL_SEARCH_APPLY_STORAGE_KEY = 'hall:search-apply';

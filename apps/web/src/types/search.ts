export type SearchResultType = 'candidate' | 'job' | 'vendor' | 'submission';

export interface SearchResult {
  type:     SearchResultType;
  id:       string;
  title:    string;
  subtitle: string | null;
  status:   string | null;
  href:     string;
}

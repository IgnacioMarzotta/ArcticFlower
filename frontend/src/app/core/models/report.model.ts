export interface PaginatedReportsResponse {
  reports: Report[];
  totalPages: number;
  currentPage: number;
  totalReports: number;
}

export interface Report {
  _id?: string;
  user?: PartialUser | string | null; 
  species?: string;
  message: string;
  type: 'bug' | 'data_error' | 'feedback';
  resolved?: boolean;
  createdAt?: string;
}

export interface PartialUser {
  _id: string;
  email: string;
}
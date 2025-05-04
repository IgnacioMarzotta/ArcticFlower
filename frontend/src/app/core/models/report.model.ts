export interface Report {
    _id?: string;
    user?: string;
    species?: string;
    message: string;
    type: 'bug' | 'data_error' | 'feedback';
    createdAt?: string;
}
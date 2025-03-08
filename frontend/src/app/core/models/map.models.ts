export interface SpeciesPoint {
    id: string;
    lat: number;
    lng: number;
    name: string;
    category: string;
    size?: number;
    color?: string;
    country?: string;
    common_name?: string;
    scientific_name?: string;
    kingdom?: string;
    locations?: any[];
    media?: string;
    taxon_id?: string;
    threats?: string;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

export interface ClusterPoint {
    id: string;
    lat: number;
    lng: number;
    name: string;
    category: string;
    size: number;
    color: string;
    country: string;
    count: number;
}

export interface AllSpeciesResponse {
  species: any[];
  total: number;
  page: number;
  totalPages: number;
}


export type MapMarker = SpeciesPoint | ClusterPoint;
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
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  locations?: any[];
  media?: SpeciesMedia[];
  taxon_id?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  description?: SpeciesDescription;
}

export interface SpeciesDescription {
  rationale?: string;
  habitat?: string;
  threats?: string;
  population?: string;
  populationTrend?: string;
  range?: string;
  useTrade?: string;
  conservationActions?: string;
}

export interface SpeciesMedia {
  type: string;
  format: string;
  identifier: string;
  title?: string;
  description?: string;
  creator?: string;
  contributor?: string;
  publisher?: string;
  rightsHolder?: string;
  license?: string;
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
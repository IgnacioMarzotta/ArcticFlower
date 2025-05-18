import { ClusterPoint, SpeciesPoint } from './map.models';

export interface Favorite {
  _id: string;
  userId: string;
  speciesId: SpeciesPoint;
  clusterId: ClusterPoint;
  dateAdded: string;
}

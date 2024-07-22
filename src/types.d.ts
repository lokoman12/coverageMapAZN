import { FeatureCollection, Feature, Polygon } from 'geojson';

declare module 'geojson' {
  export interface GeoJsonObject {
    type: string;
    features: Feature[];
  }

  export type GeoJSON = GeoJsonObject;
}

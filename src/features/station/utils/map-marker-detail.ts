export type MapMarkerDetail = 'minimal' | 'compact' | 'full';

const FULL_DETAIL_LATITUDE_DELTA = 0.035;
const COMPACT_DETAIL_LATITUDE_DELTA = 0.08;

export function getMapMarkerDetail(latitudeDelta: number): MapMarkerDetail {
  if (latitudeDelta <= FULL_DETAIL_LATITUDE_DELTA) {
    return 'full';
  }

  if (latitudeDelta <= COMPACT_DETAIL_LATITUDE_DELTA) {
    return 'compact';
  }

  return 'minimal';
}

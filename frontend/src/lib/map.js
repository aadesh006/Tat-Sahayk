import { axiosInstance } from "./axios.js";

const EARTH_RADIUS_KM = 6371;
const DEFAULT_CLUSTER_RADIUS_KM = 5;

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeLocations = (items) =>
  asArray(items).flatMap((item) => {
    if (
      !item ||
      item.latitude === null ||
      item.latitude === undefined ||
      item.longitude === null ||
      item.longitude === undefined
    ) {
      return [];
    }

    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return [];
    }

    return [{
      ...item,
      latitude,
      longitude,
    }];
  });

const toRadians = (degrees) => degrees * (Math.PI / 180);

const distanceInKilometres = (first, second) => {
  const latitudeDelta = toRadians(
    second.latitude - first.latitude
  );
  const longitudeDelta = toRadians(
    second.longitude - first.longitude
  );

  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.asin(Math.min(1, Math.sqrt(haversine)))
  );
};

export const clusterReports = (
  reports,
  radiusKm = DEFAULT_CLUSTER_RADIUS_KM
) => {
  const normalizedReports = normalizeLocations(reports);
  const processed = new Set();
  const clusters = [];

  normalizedReports.forEach((report, index) => {
    if (processed.has(index)) {
      return;
    }

    const nearbyReports = [report];
    processed.add(index);

    normalizedReports.forEach((candidate, candidateIndex) => {
      if (processed.has(candidateIndex)) {
        return;
      }

      if (
        distanceInKilometres(report, candidate) <= radiusKm
      ) {
        nearbyReports.push(candidate);
        processed.add(candidateIndex);
      }
    });

    clusters.push({
      ...report,
      cluster_count: nearbyReports.length,
      cluster_reports: nearbyReports,
    });
  });

  return clusters;
};

export const fetchMapData = async () => {
  const [
    reportsResponse,
    deploymentsResponse,
    sheltersResponse,
  ] = await Promise.all([
    axiosInstance.get("/map/map-reports"),
    axiosInstance.get("/map/deployments"),
    axiosInstance.get("/map/shelters"),
  ]);

  return {
    reports: clusterReports(reportsResponse.data),
    deployments: normalizeLocations(
      deploymentsResponse.data
    ),
    shelters: normalizeLocations(sheltersResponse.data),
  };
};
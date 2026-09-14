import {
  bucket,
  defineRailway,
  postgres,
  preserve,
  project,
  service,
  volume,
} from 'railway/iac';

export default defineRailway(() => {
  const qualitytrackDb = postgres('qualitytrack-db', {
    region: 'europe-west4-drams3a',
  });
  qualitytrackDb.networking = { privateNetworkEndpoint: 'postgres' };
  const postgresVolume = volume('postgres-volume', {
    alerts: { usage: { '100': {}, '80': {}, '95': {} } },
    allowOnlineResize: true,
    region: 'europe-west4-drams3a',
    sizeMB: 5000,
  });
  const qualitytrackBucket = bucket('qualitytrack-bucket', { region: 'ams' });
  const qualitytrackBackend = service('qualitytrack-backend', {
    // Sin `source`: el deploy lo dispara `railway up` desde GitHub Actions
    // (ver .github/workflows/ci-cd.yml, job deploy-backend), no un push a
    // GitHub watcheado por Railway -- declarar `source: github(...)` acá
    // haría que Railway también auto-deployara por su cuenta, duplicando
    // el deploy que ya gatea backend-ci.
    //
    // dockerfilePath es relativo a la raíz del repo (no hay rootDirectory
    // acá a propósito): el Dockerfile necesita ver todo el workspace pnpm
    // -- ver docs/adr/0004 y apps/backend/Dockerfile.
    build: { builder: 'DOCKERFILE', dockerfilePath: 'apps/backend/Dockerfile' },
    healthcheck: '/health',
    replicas: { 'europe-west4-drams3a': 1 },
    networking: { privateNetworkEndpoint: 'helpful-imagination' },
    env: {
      DATABASE_URL: preserve(),
      STORAGE_ACCESS_KEY_ID: preserve(),
      STORAGE_BUCKET: preserve(),
      STORAGE_ENDPOINT: preserve(),
      STORAGE_REGION: preserve(),
      STORAGE_SECRET_ACCESS_KEY: preserve(),
    },
  });

  return project('qualitytrack', {
    resources: [
      qualitytrackBackend,
      qualitytrackDb,
      postgresVolume,
      qualitytrackBucket,
    ],
  });
});

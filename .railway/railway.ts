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

  const qualitytrackFrontend = service('qualitytrack-frontend', {
    // Mismo motivo que el backend: sin `source`, el deploy lo dispara
    // `railway up` desde GitHub Actions (job deploy-frontend), no el
    // auto-deploy nativo de Railway -- ver docs/adr/0012 e issue #51.
    build: {
      builder: 'DOCKERFILE',
      dockerfilePath: 'apps/frontend/Dockerfile',
    },
    env: {
      // VITE_API_URL es un build ARG -- Vite lo inlinea en el bundle en
      // build-time, no en runtime (ver apps/frontend/Dockerfile). Railway
      // matchea el nombre del ARG contra las variables del service y lo
      // inyecta en el build automáticamente, sin config adicional.
      //
      // Referencia al dominio público del backend en vez de hardcodearlo
      // (es un dominio generado por Railway -- no se commitea un valor
      // fijo, se resuelve solo si el dominio cambia). El helper
      // `service.env.X` de la SDK no interpola dentro de un template
      // string de JS (stringifica a "[object Object]", verificado con
      // `railway config plan --json --show-values`) -- hace falta la
      // sintaxis de template de Railway a mano.
      VITE_API_URL:
        'https://${{qualitytrack-backend.RAILWAY_PUBLIC_DOMAIN}}/api/v1',
    },
  });

  return project('qualitytrack', {
    resources: [
      qualitytrackBackend,
      qualitytrackFrontend,
      qualitytrackDb,
      postgresVolume,
      qualitytrackBucket,
    ],
  });
});

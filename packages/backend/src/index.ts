import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { getDb, closeDb } from './db/index.js';
import { APRSClient } from './aprs/client.js';
import { ingestAircraftBeacon, ingestReceiverStatus } from './services/ingestion.js';
import { receiversRoutes } from './routes/receivers.js';
import { healthRoutes } from './routes/health.js';
import { rangeRoutes } from './routes/range.js';
import { coverageRoutes } from './routes/coverage.js';
import { trafficRoutes } from './routes/traffic.js';
import { liveWsRoute, broadcastPosition, broadcastReceiverStatus } from './ws/live.js';
import { scheduleCleanup } from './services/cleanup.js';
import type { ParsedAircraftBeacon, ParsedReceiverBeacon, AircraftPosition } from '@ogn-dashboard/shared';

const app = Fastify({ logger: true });

async function start() {
  // Initialize database
  getDb();

  // Register plugins
  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Register routes
  await app.register(receiversRoutes);
  await app.register(healthRoutes);
  await app.register(rangeRoutes);
  await app.register(coverageRoutes);
  await app.register(trafficRoutes);
  await app.register(liveWsRoute);

  // Start APRS client
  const aprsClient = new APRSClient();

  aprsClient.on('aircraft', (beacon: ParsedAircraftBeacon) => {
    const result = ingestAircraftBeacon(beacon);
    if (result) {
      const position: AircraftPosition = {
        receiver_id: result.receiver_id,
        timestamp: beacon.timestamp,
        aircraft_id: beacon.aircraft_id,
        aircraft_type: beacon.aircraft_type,
        address_type: beacon.address_type,
        latitude: beacon.latitude,
        longitude: beacon.longitude,
        altitude_m: beacon.altitude_m,
        course: beacon.course,
        speed_kmh: beacon.speed_kmh,
        climb_fpm: beacon.climb_fpm,
        turn_rate: beacon.turn_rate,
        snr_db: beacon.snr_db,
        error_count: beacon.error_count,
        freq_offset_khz: beacon.freq_offset_khz,
        gps_accuracy: beacon.gps_accuracy,
        distance_km: result.distance_km,
        bearing: result.bearing,
        stealth: 0,
        no_tracking: beacon.no_tracking ? 1 : 0,
      };
      broadcastPosition(app, position);
    }
  });

  aprsClient.on('receiver_status', (beacon: ParsedReceiverBeacon) => {
    ingestReceiverStatus(beacon);
    broadcastReceiverStatus(app, {
      receiver_id: beacon.receiver,
      timestamp: beacon.timestamp,
      version: beacon.version,
      cpu_load: beacon.cpu_load,
      ram_free_mb: beacon.ram_free_mb,
      ram_total_mb: beacon.ram_total_mb,
      ntp_offset_ms: beacon.ntp_offset_ms,
      ntp_ppm: beacon.ntp_ppm,
      temperature_c: beacon.temperature_c,
      rf_correction_ppm: beacon.rf_correction_ppm,
      rf_noise_db: beacon.rf_noise_db,
    });
  });

  aprsClient.connect();

  // Schedule cleanup
  scheduleCleanup();

  // Start server
  await app.listen({ port: config.port, host: config.host });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down...');
    aprsClient.disconnect();
    app.close();
    closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

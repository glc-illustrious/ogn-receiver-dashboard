import type {
  ParsedAircraftBeacon,
  ParsedReceiverBeacon,
  ParsedAPRS,
} from '@ogn-dashboard/shared';

// Header: SENDER>APRS[,RELAY*],qAR,RECEIVER:/HHMMSS...
const HEADER_RE =
  /^([A-Za-z0-9_-]+)>([^,]+),(?:.*?,)?([qQ][A-Z]{1,2}),([A-Za-z0-9_-]+):(.+)$/;

// Position: /HHMMSSh DDMM.MMN/DDDMM.MME' CCC/SSS/A=AAAAAA
const POS_RE =
  /\/(\d{6})h(\d{4}\.\d{2})([NS])[\/\\](\d{5}\.\d{2})([EW])['"A-Za-z](\d{3})\/(\d{3})\/A=(\d{6})/;

// Position precision enhancement: !W{d1}{d2}!
const PRECISION_RE = /!W(\d)(\d)!/;

// OGN extensions
const ID_RE = /id([0-9A-Fa-f]{2})([0-9A-Fa-f]{6})/;
const CLIMB_RE = /([+-]\d+)fpm/;
const TURN_RE = /([+-][\d.]+)rot/;
const SNR_RE = /([\d.]+)dB/;
const ERROR_RE = /(\d+)e/;
const FREQ_RE = /([+-][\d.]+)kHz/;
const GPS_RE = /gps(\d+x\d+)/;

// Receiver status extensions
const VER_RE = /v([\d.]+\w*)/;
const CPU_RE = /CPU:([\d.]+)/;
const RAM_RE = /RAM:([\d.]+)\/([\d.]+)MB/;
const NTP_RE = /NTP:([\d.]+)ms\/([\d.]+)ppm/;
const TEMP_RE = /([+-]?[\d.]+)C/;
const RF_CORR_RE = /RF:([+-][\d.]+)ppm/;
const RF_NOISE_RE = /([+-][\d.]+)dB/;

function parsePosition(
  lat: string,
  latDir: string,
  lon: string,
  lonDir: string,
  comment: string,
): { latitude: number; longitude: number } {
  let latitude = parseInt(lat.slice(0, 2)) + parseFloat(lat.slice(2)) / 60;
  let longitude = parseInt(lon.slice(0, 3)) + parseFloat(lon.slice(3)) / 60;

  // Apply precision enhancement
  const precision = comment.match(PRECISION_RE);
  if (precision) {
    latitude += (parseInt(precision[1]) / 1000 / 60);
    longitude += (parseInt(precision[2]) / 1000 / 60);
  }

  if (latDir === 'S') latitude = -latitude;
  if (lonDir === 'W') longitude = -longitude;

  return { latitude, longitude };
}

function parseTimestamp(hhmmss: string): string {
  const now = new Date();
  const h = parseInt(hhmmss.slice(0, 2));
  const m = parseInt(hhmmss.slice(2, 4));
  const s = parseInt(hhmmss.slice(4, 6));
  now.setUTCHours(h, m, s, 0);
  return now.toISOString();
}

export function parseAPRS(line: string): ParsedAPRS | null {
  // Skip comments and server messages
  if (line.startsWith('#') || !line.includes('>')) {
    return null;
  }

  const headerMatch = line.match(HEADER_RE);
  if (!headerMatch) return null;

  const [, sender, , qConstruct, receiver, body] = headerMatch;

  const posMatch = body.match(POS_RE);
  if (!posMatch) return null;

  const [, time, lat, latDir, lon, lonDir, courseStr, speedStr, altStr] = posMatch;
  const { latitude, longitude } = parsePosition(lat, latDir, lon, lonDir, body);
  const altitude_m = Math.round(parseInt(altStr) * 0.3048); // feet → meters
  const course = parseInt(courseStr);
  const speed_kmh = Math.round(parseInt(speedStr) * 1.852); // knots → km/h
  const timestamp = parseTimestamp(time);

  // Determine if this is an aircraft beacon or receiver status
  const idMatch = body.match(ID_RE);

  if (idMatch) {
    // Aircraft beacon
    const typeByte = parseInt(idMatch[1], 16);
    const aircraft_type = (typeByte >> 2) & 0x0f;
    const address_type = typeByte & 0x03;
    const stealth = !!(typeByte & 0x80);
    const no_tracking = !!(typeByte & 0x40);

    const climbMatch = body.match(CLIMB_RE);
    const turnMatch = body.match(TURN_RE);
    const snrMatch = body.match(SNR_RE);
    const errorMatch = body.match(ERROR_RE);
    const freqMatch = body.match(FREQ_RE);
    const gpsMatch = body.match(GPS_RE);

    return {
      type: 'aircraft',
      raw: line,
      sender,
      receiver,
      timestamp,
      latitude,
      longitude,
      altitude_m,
      course,
      speed_kmh,
      aircraft_id: idMatch[2],
      aircraft_type,
      address_type,
      climb_fpm: climbMatch ? parseInt(climbMatch[1]) : null,
      turn_rate: turnMatch ? parseFloat(turnMatch[1]) : null,
      snr_db: snrMatch ? parseFloat(snrMatch[1]) : null,
      error_count: errorMatch ? parseInt(errorMatch[1]) : null,
      freq_offset_khz: freqMatch ? parseFloat(freqMatch[1]) : null,
      gps_accuracy: gpsMatch ? gpsMatch[1] : null,
      stealth,
      no_tracking,
    } satisfies ParsedAircraftBeacon;
  }

  // Receiver status beacon (qAR from receiver itself, no id field)
  if (qConstruct === 'qAR' || qConstruct === 'qAS') {
    // Check if body has receiver-like extensions
    const verMatch = body.match(VER_RE);
    const cpuMatch = body.match(CPU_RE);

    if (verMatch || cpuMatch || sender === receiver) {
      const ramMatch = body.match(RAM_RE);
      const ntpMatch = body.match(NTP_RE);
      const tempMatch = body.match(TEMP_RE);
      const rfCorrMatch = body.match(RF_CORR_RE);
      const rfNoiseMatch = body.match(RF_NOISE_RE);

      return {
        type: 'receiver_status',
        raw: line,
        receiver: sender,
        timestamp,
        latitude,
        longitude,
        altitude_m,
        version: verMatch ? verMatch[1] : null,
        cpu_load: cpuMatch ? parseFloat(cpuMatch[1]) : null,
        ram_free_mb: ramMatch ? parseFloat(ramMatch[1]) : null,
        ram_total_mb: ramMatch ? parseFloat(ramMatch[2]) : null,
        ntp_offset_ms: ntpMatch ? parseFloat(ntpMatch[1]) : null,
        ntp_ppm: ntpMatch ? parseFloat(ntpMatch[2]) : null,
        temperature_c: tempMatch ? parseFloat(tempMatch[1]) : null,
        rf_correction_ppm: rfCorrMatch ? parseFloat(rfCorrMatch[1]) : null,
        rf_noise_db: rfNoiseMatch ? parseFloat(rfNoiseMatch[1]) : null,
      } satisfies ParsedReceiverBeacon;
    }
  }

  return { type: 'unknown', raw: line };
}

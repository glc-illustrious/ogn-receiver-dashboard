import { describe, it, expect } from 'vitest';
import { parseAPRS } from './parser.js';
import type { ParsedAircraftBeacon, ParsedReceiverBeacon } from '@ogn-dashboard/shared';

describe('APRS Parser', () => {
  it('should parse aircraft position beacon', () => {
    const line =
      'FLRDDDEAD>APRS,qAS,EHGR:/114500h5029.86N/00956.98E\'342/049/A=005524 !W65! id054B4E68 -395fpm -1.5rot 16.5dB 0e -14.3kHz gps1x2';
    const result = parseAPRS(line) as ParsedAircraftBeacon;

    expect(result).not.toBeNull();
    expect(result.type).toBe('aircraft');
    expect(result.sender).toBe('FLRDDDEAD');
    expect(result.receiver).toBe('EHGR');
    expect(result.aircraft_id).toBe('4B4E68');
    expect(result.aircraft_type).toBe(1); // glider (0x05 >> 2 & 0x0f = 1)
    expect(result.address_type).toBe(1); // ICAO (0x05 & 0x03 = 1)
    // 5029.866N = 50 + 29.866/60 = 50.49777
    expect(result.latitude).toBeCloseTo(50.4978, 3);
    // 00956.985E = 9 + 56.985/60 = 9.9498
    expect(result.longitude).toBeCloseTo(9.9498, 3);
    expect(result.altitude_m).toBe(1684); // 5524ft in meters
    expect(result.course).toBe(342);
    expect(result.speed_kmh).toBe(91); // 49 knots
    expect(result.climb_fpm).toBe(-395);
    expect(result.turn_rate).toBe(-1.5);
    expect(result.snr_db).toBe(16.5);
    expect(result.error_count).toBe(0);
    expect(result.freq_offset_khz).toBe(-14.3);
    expect(result.gps_accuracy).toBe('1x2');
    expect(result.stealth).toBe(false);
    expect(result.no_tracking).toBe(false);
  });

  it('should parse stealth and no-tracking flags', () => {
    const line =
      'FLRDDBEEF>APRS,qAS,RECV:/120000h5130.00N/00500.00E\'000/000/A=001000 idC4AABBCC +100fpm 5.0dB 0e gps3x4';
    const result = parseAPRS(line) as ParsedAircraftBeacon;

    expect(result).not.toBeNull();
    expect(result.type).toBe('aircraft');
    // 0xC4 = 1100 0100: stealth=1, no_tracking=1, type=1 (glider), addr=0
    expect(result.stealth).toBe(true);
    expect(result.no_tracking).toBe(true);
    expect(result.aircraft_type).toBe(1);
    expect(result.address_type).toBe(0);
  });

  it('should skip comment lines', () => {
    expect(parseAPRS('# comment line')).toBeNull();
  });

  it('should skip malformed lines', () => {
    expect(parseAPRS('garbage data')).toBeNull();
    expect(parseAPRS('')).toBeNull();
  });

  it('should handle southern/western hemisphere', () => {
    const line =
      'FLRTEST01>APRS,qAS,RECV:/100000h3330.00S/05800.00W\'090/050/A=003000 id0612AB34 +200fpm 10.0dB 0e gps2x3';
    const result = parseAPRS(line) as ParsedAircraftBeacon;

    expect(result).not.toBeNull();
    expect(result.latitude).toBeLessThan(0);
    expect(result.longitude).toBeLessThan(0);
  });

  it('should handle missing optional OGN fields', () => {
    const line =
      'FLRTEST02>APRS,qAS,RECV:/100000h5130.00N/00500.00E\'000/000/A=001000 id0412AB34';
    const result = parseAPRS(line) as ParsedAircraftBeacon;

    expect(result).not.toBeNull();
    expect(result.climb_fpm).toBeNull();
    expect(result.turn_rate).toBeNull();
    expect(result.snr_db).toBeNull();
    expect(result.error_count).toBeNull();
    expect(result.freq_offset_khz).toBeNull();
    expect(result.gps_accuracy).toBeNull();
  });
});

import { useState, useEffect, useMemo, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import { useAircraftStore } from '../stores/aircraft';
import { useUIStore } from '../stores/ui';
import { useReceivers } from '../hooks/use-receivers';
import { GlassCard } from '../components/shared/glass-card';
import { api } from '../api/client';
import { altitudeColor, snrColor, speedColor } from '../lib/colors';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { AircraftPosition } from '@ogn-dashboard/shared';

function positionsToGeoJSON(
  positions: Map<string, AircraftPosition>,
  colorMode: 'altitude' | 'snr' | 'speed',
) {
  const features = Array.from(positions.values()).map((p) => {
    let color: string;
    switch (colorMode) {
      case 'snr':
        color = p.snr_db != null ? snrColor(p.snr_db) : '#666';
        break;
      case 'speed':
        color = p.speed_kmh != null ? speedColor(p.speed_kmh) : '#666';
        break;
      default:
        color = p.altitude_m != null ? altitudeColor(p.altitude_m) : '#666';
    }

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [p.longitude, p.latitude],
      },
      properties: {
        color,
        aircraft_id: p.aircraft_id,
        altitude_m: p.altitude_m,
        speed_kmh: p.speed_kmh,
        snr_db: p.snr_db,
        distance_km: p.distance_km,
      },
    };
  });

  return { type: 'FeatureCollection' as const, features };
}

function generateRangeRings(lat: number, lon: number) {
  const radii = [25, 50, 100, 150];
  return radii.map((radiusKm) => {
    const points = 64;
    const coords: [number, number][] = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dLat = (radiusKm / 111.32) * Math.cos(angle);
      const dLon =
        (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
      coords.push([lon + dLon, lat + dLat]);
    }
    return {
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: coords },
      properties: { label: `${radiusKm} km` },
    };
  });
}

export default function RangeMapPage() {
  const { receivers } = useReceivers();
  const positions = useAircraftStore((s) => s.positions);
  const mapColorMode = useUIStore((s) => s.mapColorMode);
  const mapMode = useUIStore((s) => s.mapMode);
  const showCoverage = useUIStore((s) => s.showCoverage);
  const showRangeRings = useUIStore((s) => s.showRangeRings);
  const showAircraft = useUIStore((s) => s.showAircraft);
  const setMapColorMode = useUIStore((s) => s.setMapColorMode);
  const setMapMode = useUIStore((s) => s.setMapMode);
  const setShowCoverage = useUIStore((s) => s.setShowCoverage);
  const setShowRangeRings = useUIStore((s) => s.setShowRangeRings);
  const setShowAircraft = useUIStore((s) => s.setShowAircraft);

  const [historicalData, setHistoricalData] = useState<AircraftPosition[]>([]);
  const [coverageData, setCoverageData] = useState<unknown[]>([]);

  const receiver = receivers[0];
  const centerLat = receiver?.latitude ?? 51.5674;
  const centerLon = receiver?.longitude ?? 4.9318;

  // Load historical data
  useEffect(() => {
    if (mapMode === 'historical' && receiver) {
      api
        .getRange(receiver.id, { range: '24h', limit: '50000' })
        .then((data) => setHistoricalData(data as AircraftPosition[]));
    }
  }, [mapMode, receiver]);

  // Load coverage
  useEffect(() => {
    if (receiver) {
      api.getCoverage(receiver.id).then(setCoverageData);
    }
  }, [receiver]);

  const geojson = useMemo(() => {
    if (mapMode === 'historical') {
      const posMap = new Map<string, AircraftPosition>();
      historicalData.forEach((p) => posMap.set(`${p.aircraft_id}-${p.timestamp}`, p));
      return positionsToGeoJSON(posMap, mapColorMode);
    }
    return positionsToGeoJSON(positions, mapColorMode);
  }, [positions, historicalData, mapColorMode, mapMode]);

  const rangeRingsGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: generateRangeRings(centerLat, centerLon),
    }),
    [centerLat, centerLon],
  );

  const coverageGeoJSON = useMemo(() => {
    if (!coverageData.length || !receiver) return null;
    const sectors = coverageData as Array<{
      bearing_start: number;
      bearing_end: number;
      max_distance_km: number;
      sample_lat: number;
      sample_lon: number;
    }>;

    const coords: [number, number][] = [[centerLon, centerLat]];
    for (const sector of sectors) {
      if (sector.sample_lat && sector.sample_lon) {
        coords.push([sector.sample_lon, sector.sample_lat]);
      }
    }
    if (coords.length > 2) {
      coords.push(coords[1]);
    }

    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [coords] },
          properties: {},
        },
      ],
    };
  }, [coverageData, receiver, centerLat, centerLon]);

  const handleColorMode = useCallback((mode: 'altitude' | 'snr' | 'speed') => setMapColorMode(mode), [setMapColorMode]);
  const handleMapMode = useCallback((mode: 'live' | 'historical') => setMapMode(mode), [setMapMode]);

  return (
    <div className="page-enter">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">Range map</h2>
        <p className="text-[13px] text-white/50 mt-1">
          Aircraft positions and coverage{receiver ? ` — ${receiver.id}` : ''}
        </p>
      </div>

      <div className="relative h-[calc(100vh-120px)] rounded-xl overflow-hidden">
        <Map
          initialViewState={{
            latitude: centerLat,
            longitude: centerLon,
            zoom: 7,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://tiles.openfreemap.org/styles/dark"
        >
          <NavigationControl position="bottom-right" />

          {/* Coverage polygon */}
          {showCoverage && coverageGeoJSON && (
            <Source id="coverage" type="geojson" data={coverageGeoJSON}>
              <Layer
                id="coverage-fill"
                type="fill"
                paint={{
                  'fill-color': '#60a5fa',
                  'fill-opacity': 0.08,
                }}
              />
              <Layer
                id="coverage-border"
                type="line"
                paint={{
                  'line-color': '#60a5fa',
                  'line-opacity': 0.3,
                  'line-width': 1,
                  'line-dasharray': [4, 2],
                }}
              />
            </Source>
          )}

          {/* Range rings */}
          {showRangeRings && (
            <Source id="range-rings" type="geojson" data={rangeRingsGeoJSON}>
              <Layer
                id="range-rings-line"
                type="line"
                paint={{
                  'line-color': 'rgba(255, 255, 255, 0.1)',
                  'line-width': 1,
                  'line-dasharray': [4, 4],
                }}
              />
            </Source>
          )}

          {/* Aircraft dots */}
          {showAircraft && (
            <Source
              id="aircraft"
              type="geojson"
              data={geojson}
              cluster={mapMode === 'historical'}
              clusterMaxZoom={14}
              clusterRadius={50}
            >
              <Layer
                id="aircraft-dots"
                type="circle"
                filter={['!', ['has', 'point_count']]}
                paint={{
                  'circle-radius': 4,
                  'circle-color': ['get', 'color'],
                  'circle-opacity': 0.9,
                  'circle-blur': 0.3,
                }}
              />
              <Layer
                id="clusters"
                type="circle"
                filter={['has', 'point_count']}
                paint={{
                  'circle-color': '#60a5fa',
                  'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    12, 20, 16, 50, 20,
                  ],
                  'circle-opacity': 0.7,
                }}
              />
              <Layer
                id="cluster-count"
                type="symbol"
                filter={['has', 'point_count']}
                layout={{
                  'text-field': '{point_count_abbreviated}',
                  'text-size': 10,
                }}
                paint={{
                  'text-color': '#fff',
                }}
              />
            </Source>
          )}
        </Map>

        {/* Floating controls */}
        <div className="absolute top-3.5 right-3.5 w-[240px] z-10">
          <GlassCard>
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-[11px] text-white/30 uppercase tracking-wider">Mode</div>
                <div className="flex gap-1 mt-1">
                  {(['live', 'historical'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleMapMode(m)}
                      className={`px-2.5 py-1 rounded text-[11px] border cursor-pointer ${
                        mapMode === m
                          ? 'bg-blue-400/[0.15] text-blue-400 border-blue-400/30'
                          : 'bg-transparent text-white/50 border-white/[0.08]'
                      }`}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-white/30 uppercase tracking-wider">Color by</div>
                <div className="flex gap-1 mt-1">
                  {(['altitude', 'snr', 'speed'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => handleColorMode(c)}
                      className={`px-2.5 py-1 rounded text-[11px] border cursor-pointer ${
                        mapColorMode === c
                          ? 'bg-blue-400/[0.15] text-blue-400 border-blue-400/30'
                          : 'bg-transparent text-white/50 border-white/[0.08]'
                      }`}
                    >
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-white/30 uppercase tracking-wider">Layers</div>
                <div className="flex flex-col gap-1 mt-1">
                  {[
                    { label: 'Coverage', checked: showCoverage, onChange: setShowCoverage },
                    { label: 'Range rings', checked: showRangeRings, onChange: setShowRangeRings },
                    { label: 'Aircraft', checked: showAircraft, onChange: setShowAircraft },
                  ].map(({ label, checked, onChange }) => (
                    <label
                      key={label}
                      className="text-[11px] flex items-center gap-1.5 text-white/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        className="accent-blue-400"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3.5 left-3.5 z-10">
          <GlassCard className="text-[11px]">
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className="w-[60px] h-1.5 rounded-full"
                style={{
                  background:
                    mapColorMode === 'altitude'
                      ? 'linear-gradient(90deg, #60a5fa, #4ade80, #facc15, #f87171)'
                      : mapColorMode === 'snr'
                        ? 'linear-gradient(90deg, #f87171, #facc15, #4ade80)'
                        : 'linear-gradient(90deg, #60a5fa, #22d3ee, #facc15, #f87171)',
                }}
              />
              <span>
                {mapColorMode === 'altitude'
                  ? '0 m — 3000+ m'
                  : mapColorMode === 'snr'
                    ? '0 — 20+ dB'
                    : '0 — 250+ km/h'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 border border-white/80 shadow-[0_0_6px_#34d399]" />
              <span>Receiver</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

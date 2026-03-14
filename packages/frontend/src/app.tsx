import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Sidebar } from './components/layout/sidebar';

const DashboardPage = lazy(() => import('./pages/dashboard'));
const RangeMapPage = lazy(() => import('./pages/range-map'));
const SystemHealthPage = lazy(() => import('./pages/system-health'));
const TrafficStatsPage = lazy(() => import('./pages/traffic-stats'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-white/30 text-sm">Loading...</div>
    </div>
  );
}

export function App() {
  return (
    <div className="flex h-screen relative z-[1]">
      {/* Gradient blobs */}
      <div className="fixed rounded-full pointer-events-none z-0 w-[600px] h-[600px] bg-indigo-500/[0.06] -top-[200px] -left-[100px] blur-[120px]" />
      <div className="fixed rounded-full pointer-events-none z-0 w-[500px] h-[500px] bg-violet-500/[0.05] -bottom-[150px] -right-[100px] blur-[120px]" />
      <div className="fixed rounded-full pointer-events-none z-0 w-[400px] h-[400px] bg-cyan-400/[0.04] top-[40%] left-[50%] blur-[120px]" />

      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 lg:p-7 relative z-[1]">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/map" element={<RangeMapPage />} />
            <Route path="/health" element={<SystemHealthPage />} />
            <Route path="/traffic" element={<TrafficStatsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

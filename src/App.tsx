import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { DownloadProvider } from './contexts/DownloadContext';
import { ServiceStatusProvider } from './contexts/ServiceStatusContext';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Deluge } from './pages/Deluge';
import { Prowlarr } from './pages/Prowlarr';
import { Synology } from './pages/Synology';
import { Settings } from './pages/Settings';
import { Series } from './pages/Series';
import YoutubeToMP3 from './pages/YoutubeToMP3';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { DownloadManager } from './components/DownloadManager';

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
    className="h-full"
  >
    {children}
  </motion.div>
);

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={<PageTransition><Home /></PageTransition>} />
          <Route path="deluge" element={<PageTransition><Deluge /></PageTransition>} />
          <Route path="prowlarr" element={<PageTransition><Prowlarr /></PageTransition>} />
          <Route path="synology" element={<PageTransition><Synology /></PageTransition>} />
          <Route path="series" element={<PageTransition><Series /></PageTransition>} />
          <Route path="youtube" element={<PageTransition><YoutubeToMP3 /></PageTransition>} />
          <Route path="settings" element={<PageTransition><Settings /></PageTransition>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AppProvider>
      <DownloadProvider>
        <ServiceStatusProvider>
          <HashRouter>
            <Toaster position="top-right" richColors />
            <DownloadManager />
            <AnimatedRoutes />
          </HashRouter>
        </ServiceStatusProvider>
      </DownloadProvider>
    </AppProvider>
  );
}

export default App;

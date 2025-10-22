import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('lucide-react') || id.includes('react-hot-toast')) {
              return 'ui-vendor';
            }
            // Other node_modules go to vendor
            return 'vendor';
          }
          
          // Feature-based chunks
          if (id.includes('/components/')) {
            if (id.includes('Management.tsx') || id.includes('Settings.tsx')) {
              return 'management';
            }
            if (id.includes('Analytics.tsx') || id.includes('Reports') || id.includes('LoginLogs.tsx')) {
              return 'analytics';
            }
            if (id.includes('Borrowing') || id.includes('Reservation') || id.includes('Digital') || id.includes('Recommendations')) {
              return 'library';
            }
            if (id.includes('Leaderboard') || id.includes('Review') || id.includes('Challenge')) {
              return 'engagement';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase from 500 to 600
  },
});

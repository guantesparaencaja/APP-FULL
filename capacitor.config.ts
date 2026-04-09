import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.guantes.app',
  appName: 'Guantes Para Encajar',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '167463849607-hoe69v91apphptv4ifndnqcb3st2ajeq.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;

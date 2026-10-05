/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Explicit allowed origins for mobile access over LAN
  allowedDevOrigins: [
    '192.168.1.6',
    '192.168.1.6:3000',
    '192.168.1.6:3001',
    'localhost:3000',
    'localhost:3001',
    '127.0.0.1:3000',
    '127.0.0.1:3001',
  ],

  // Optimize for mobile base64 data URLs
  images: {
    unoptimized: true,
  },

  // Auto-redirect aliases (e.g., /train -> /training)
  async redirects() {
    return [
      {
        source: '/train',
        destination: '/training',
        permanent: true,
      },
      {
        source: '/training/history',
        destination: '/training',
        permanent: false,
      },
      {
        source: '/attendance/history',
        destination: '/attendance',
        permanent: false,
      },
      {
        source: '/kiosk',
        destination: '/kiosk/attendance',
        permanent: false,
      },
    ];
  },

  // Camera permissions policy headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

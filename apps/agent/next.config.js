const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';
const hasSentry = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

const cspHeader = [
  "default-src 'self'",
  `script-src 'self' ${isDev ? "'unsafe-eval' " : ''}'unsafe-inline' https://*.walletconnect.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self'",
  "connect-src 'self' https://*.base.org https://api.render.com https://api.circle.com https://api.openai.com https://*.walletconnect.com https://*.sentry.io",
  "frame-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  output: process.platform === 'linux' ? 'standalone' : undefined,
  transpilePackages: ['@sigil/shared', '@sigil/db', '@sigil/blockchain', '@sigil/sdk'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: cspHeader },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};

const sentryConfig = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
};

module.exports = hasSentry ? withSentryConfig(nextConfig, sentryConfig) : nextConfig;

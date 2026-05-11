/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip prerendering semua halaman saat build
  // sehingga env variable tidak diakses sebelum runtime
  experimental: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  // Ini yang paling penting: skip static generation global
  output: undefined,
}

module.exports = nextConfig

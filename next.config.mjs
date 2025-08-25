/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
<<<<<<< HEAD
=======
  env: {
    NEXT_PUBLIC_BACKEND_BASE: process.env.NEXT_PUBLIC_BACKEND_BASE || 'http://localhost:8080',
  },
>>>>>>> 36958c5 (docs/ 로컬 프로젝트 초기 셋업)
}

export default nextConfig

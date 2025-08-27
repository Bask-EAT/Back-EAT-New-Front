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
    env: {
        NEXT_PUBLIC_BACKEND_BASE:
            process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080",
    },
    async rewrites() {
        return [
            {
                source: "/api/:path*", // '/api/'로 시작하는 모든 경로를
                destination: "http://localhost:8080/api/:path*", // 백엔드 주소로 전달합니다.
            },
        ];
    },
};

export default nextConfig

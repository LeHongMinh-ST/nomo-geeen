import type { NextConfig } from "next";

// FE goi thang NestJS backend (NEXT_PUBLIC_API_BASE_URL, mac dinh
// http://localhost:3001). Browser attach + luu HttpOnly cookie
// 'nomo_admin_rt' qua CORS credentials=true. Khong con Next rewrite
// / catch-all proxy.

const nextConfig: NextConfig = {};

export default nextConfig;

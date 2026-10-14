/** @type {import('next').NextConfig} */
const nextConfig = {
  // 仓库根的 ESLint 配置会被向上继承，构建期 lint 与 Next 无关，关掉
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig

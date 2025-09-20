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
  webpack: (config, { isServer }) => {
    // ONNX Runtime Web 설정
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
      
      // ONNX 관련 파일들을 외부 모듈로 처리
      config.externals = config.externals || []
      config.externals.push({
        'onnxruntime-node': 'onnxruntime-node',
      })
      
      // .mjs 파일 처리
      config.module.rules.push({
        test: /\.mjs$/,
        type: 'javascript/auto',
      })
    }
    
    return config
  },
  // 정적 파일 복사 설정
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        source: '/audio-worklets/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig

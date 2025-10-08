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
  // Ensure ESM deps like onnxruntime-web get transpiled properly
  transpilePackages: ["onnxruntime-web"],
  experimental: {
    esmExternals: "loose",
  },
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}
    // Ensure no stale alias maps onnxruntime-web to a non-exported subpath
    if (config.resolve.alias["onnxruntime-web"]) {
      delete config.resolve.alias["onnxruntime-web"]
    }
    if (isServer) {
      config.externals = config.externals || []
      // Keep node bundle from attempting to include browser ESM
      config.externals.push({ "onnxruntime-web": "commonjs onnxruntime-web" })
    }
    // Workaround: disable minification to avoid Terser parsing ESM import.meta in ort bundle
    config.optimization = config.optimization || {}
    config.optimization.minimize = false
    return config
  },
}

export default nextConfig

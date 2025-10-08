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
    // Ensure browser-friendly ORT build is used in client bundles
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}
    config.resolve.alias["onnxruntime-web"] = "onnxruntime-web/dist/ort-web.min.mjs"

    if (isServer) {
      // Prevent importing the node ESM variant into the server bundle
      config.externals = config.externals || []
      config.externals.push({ "onnxruntime-web": "commonjs onnxruntime-web" })
    }
    return config
  },
}

export default nextConfig

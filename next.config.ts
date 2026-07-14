import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server (HMR websocket + dev-only assets) be reached from
  // other devices on the LAN (e.g. testing on a phone via the machine's
  // local IP instead of localhost). Without this, Next.js rejects those
  // cross-origin dev requests, the HMR socket fails to connect, and the
  // page's client-side interactivity silently breaks even though the
  // server-rendered HTML still looks correct.
  allowedDevOrigins: ["192.168.1.229"],
};

export default nextConfig;

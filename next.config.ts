import type { NextConfig } from "next";
import os from "node:os";

function getLocalIpv4s(): string[] {
  const nets = os.networkInterfaces();
  const ips = new Set<string>();

  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family !== "IPv4") continue;
      if (entry.internal) continue;
      if (!entry.address) continue;
      ips.add(entry.address);
    }
  }

  return Array.from(ips);
}

const envHost = process.env.APP_HOSTNAME?.trim() || "seo-ot";
const envIp = process.env.APP_HOST_IP?.trim();
const allowedOrigins = new Set<string>(["localhost", "127.0.0.1", envHost]);

if (envIp) allowedOrigins.add(envIp);
for (const ip of getLocalIpv4s()) {
  allowedOrigins.add(ip);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: Array.from(allowedOrigins),
};

export default nextConfig;

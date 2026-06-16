/**
 * Traffic Monitoring System
 * Based on LunaTV implementation
 *
 * Tracks real traffic, domain breakdown, and user statistics
 */

interface TrafficRecord {
  timestamp: number;
  path: string;
  method: string;
  statusCode: number;
  responseSize: number;
  duration: number;
  ip: string;
  userAgent: string;
  referer?: string;
}

interface DomainStats {
  domain: string;
  requests: number;
  bytes: number;
  avgDuration: number;
  errorRate: number;
}

interface TrafficSummary {
  totalRequests: number;
  totalBytes: number;
  avgDuration: number;
  errorRate: number;
  topDomains: DomainStats[];
  requestsPerMinute: number;
  timestamp: number;
}

// In-memory traffic buffer
const trafficBuffer: TrafficRecord[] = [];
const MAX_BUFFER_SIZE = 10000;

// Domain statistics cache
const domainStats = new Map<
  string,
  {
    requests: number;
    bytes: number;
    totalDuration: number;
    errors: number;
  }
>();

/**
 * Record traffic
 */
export function recordTraffic(record: TrafficRecord): void {
  trafficBuffer.push(record);

  if (trafficBuffer.length > MAX_BUFFER_SIZE) {
    trafficBuffer.shift();
  }

  // Update domain stats
  try {
    const url = new URL(record.path, 'http://localhost');
    const domain = url.hostname || 'unknown';

    const stats = domainStats.get(domain) || {
      requests: 0,
      bytes: 0,
      totalDuration: 0,
      errors: 0,
    };

    stats.requests++;
    stats.bytes += record.responseSize;
    stats.totalDuration += record.duration;
    if (record.statusCode >= 400) {
      stats.errors++;
    }

    domainStats.set(domain, stats);
  } catch {
    // Ignore URL parse errors
  }
}

/**
 * Get traffic summary
 */
export function getTrafficSummary(): TrafficSummary {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Filter recent requests
  const recentRequests = trafficBuffer.filter(
    (r) => r.timestamp > oneMinuteAgo,
  );

  // Calculate totals
  const totalRequests = trafficBuffer.length;
  const totalBytes = trafficBuffer.reduce((sum, r) => sum + r.responseSize, 0);
  const totalDuration = trafficBuffer.reduce((sum, r) => sum + r.duration, 0);
  const errorCount = trafficBuffer.filter((r) => r.statusCode >= 400).length;

  // Get top domains
  const topDomains: DomainStats[] = Array.from(domainStats.entries())
    .map(([domain, stats]) => ({
      domain,
      requests: stats.requests,
      bytes: stats.bytes,
      avgDuration:
        stats.requests > 0 ? stats.totalDuration / stats.requests : 0,
      errorRate: stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);

  return {
    totalRequests,
    totalBytes,
    avgDuration: totalRequests > 0 ? totalDuration / totalRequests : 0,
    errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
    topDomains,
    requestsPerMinute: recentRequests.length,
    timestamp: now,
  };
}

/**
 * Get traffic by time range
 */
export function getTrafficByTimeRange(
  startTime: number,
  endTime: number,
): TrafficRecord[] {
  return trafficBuffer.filter(
    (r) => r.timestamp >= startTime && r.timestamp <= endTime,
  );
}

/**
 * Get traffic by domain
 */
export function getTrafficByDomain(domain: string): DomainStats | undefined {
  const stats = domainStats.get(domain);
  if (!stats) return undefined;

  return {
    domain,
    requests: stats.requests,
    bytes: stats.bytes,
    avgDuration: stats.requests > 0 ? stats.totalDuration / stats.requests : 0,
    errorRate: stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0,
  };
}

/**
 * Clear old traffic data
 */
export function clearOldTraffic(maxAge: number = 24 * 60 * 60 * 1000): void {
  const cutoff = Date.now() - maxAge;
  const index = trafficBuffer.findIndex((r) => r.timestamp > cutoff);
  if (index > 0) {
    trafficBuffer.splice(0, index);
  }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get user agent statistics
 */
export function getUserAgentStats(): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const record of trafficBuffer) {
    const ua = record.userAgent || 'unknown';
    // Simplify user agent
    let simplified = 'Other';
    if (ua.includes('Chrome')) simplified = 'Chrome';
    else if (ua.includes('Firefox')) simplified = 'Firefox';
    else if (ua.includes('Safari')) simplified = 'Safari';
    else if (ua.includes('Edge')) simplified = 'Edge';
    else if (ua.includes('Mobile')) simplified = 'Mobile';

    stats[simplified] = (stats[simplified] || 0) + 1;
  }

  return stats;
}

/**
 * Performance Monitoring Dashboard
 * Based on LunaTV implementation
 *
 * Provides real-time performance metrics visualization
 */

interface DashboardMetrics {
  requests: {
    total: number;
    perMinute: number;
    avgDuration: number;
    errorRate: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  sources: {
    total: number;
    available: number;
    avgResponseTime: number;
  };
  timestamp: number;
}

// In-memory metrics buffer
const metricsBuffer: DashboardMetrics[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Collect current system metrics
 */
export function collectMetrics(): DashboardMetrics {
  const memUsage = process.memoryUsage();
  const os = require('os');

  return {
    requests: {
      total: 0,
      perMinute: 0,
      avgDuration: 0,
      errorRate: 0,
    },
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
    },
    cpu: {
      usage: 0,
      cores: os.cpus().length,
    },
    cache: {
      hits: 0,
      misses: 0,
      hitRate: 0,
    },
    sources: {
      total: 0,
      available: 0,
      avgResponseTime: 0,
    },
    timestamp: Date.now(),
  };
}

/**
 * Record metrics
 */
export function recordMetrics(metrics: DashboardMetrics): void {
  metricsBuffer.push(metrics);

  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift();
  }
}

/**
 * Get metrics for time range
 */
export function getMetricsForTimeRange(
  startTime: number,
  endTime: number,
): DashboardMetrics[] {
  return metricsBuffer.filter(
    (m) => m.timestamp >= startTime && m.timestamp <= endTime,
  );
}

/**
 * Get latest metrics
 */
export function getLatestMetrics(): DashboardMetrics | null {
  return metricsBuffer.length > 0
    ? metricsBuffer[metricsBuffer.length - 1]
    : null;
}

/**
 * Get aggregated metrics
 */
export function getAggregatedMetrics(): {
  avgMemory: number;
  maxMemory: number;
  avgCpu: number;
  maxCpu: number;
  dataPoints: number;
} {
  if (metricsBuffer.length === 0) {
    return { avgMemory: 0, maxMemory: 0, avgCpu: 0, maxCpu: 0, dataPoints: 0 };
  }

  const totalMemory = metricsBuffer.reduce((sum, m) => sum + m.memory.used, 0);
  const maxMemory = Math.max(...metricsBuffer.map((m) => m.memory.used));
  const totalCpu = metricsBuffer.reduce((sum, m) => sum + m.cpu.usage, 0);
  const maxCpu = Math.max(...metricsBuffer.map((m) => m.cpu.usage));

  return {
    avgMemory: totalMemory / metricsBuffer.length,
    maxMemory,
    avgCpu: totalCpu / metricsBuffer.length,
    maxCpu,
    dataPoints: metricsBuffer.length,
  };
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
 * Format duration to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

/**
 * Generate dashboard HTML
 */
export function generateDashboardHTML(metrics: DashboardMetrics): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Dashboard</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric { display: flex; justify-content: space-between; margin: 10px 0; }
    .metric-label { color: #666; }
    .metric-value { font-weight: bold; }
    .status-ok { color: #4caf50; }
    .status-warning { color: #ff9800; }
    .status-error { color: #f44336; }
  </style>
</head>
<body>
  <h1>Performance Dashboard</h1>
  
  <div class="card">
    <h2>System</h2>
    <div class="metric">
      <span class="metric-label">Memory</span>
      <span class="metric-value">${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)} (${metrics.memory.percentage.toFixed(1)}%)</span>
    </div>
    <div class="metric">
      <span class="metric-label">CPU Cores</span>
      <span class="metric-value">${metrics.cpu.cores}</span>
    </div>
  </div>
  
  <div class="card">
    <h2>Requests</h2>
    <div class="metric">
      <span class="metric-label">Total</span>
      <span class="metric-value">${metrics.requests.total}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Avg Duration</span>
      <span class="metric-value">${formatDuration(metrics.requests.avgDuration)}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Error Rate</span>
      <span class="metric-value ${metrics.requests.errorRate > 5 ? 'status-error' : 'status-ok'}">${metrics.requests.errorRate.toFixed(1)}%</span>
    </div>
  </div>
  
  <div class="card">
    <h2>Sources</h2>
    <div class="metric">
      <span class="metric-label">Available</span>
      <span class="metric-value">${metrics.sources.available} / ${metrics.sources.total}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Avg Response Time</span>
      <span class="metric-value">${formatDuration(metrics.sources.avgResponseTime)}</span>
    </div>
  </div>
  
  <p style="color: #999; text-align: center;">Last updated: ${new Date(metrics.timestamp).toLocaleString()}</p>
</body>
</html>
  `;
}

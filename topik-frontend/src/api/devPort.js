const DEV_PORTS = [8080, 8081, 8082, 8083, 8084, 8085];
let resolvedPort = null;

async function probePort(port) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

/** Kiểm tra backend qua Vite proxy (cùng origin) */
async function probeProxy() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch('/api/v1/health', { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

export async function resolveDevApiPort() {
  if (!import.meta.env.DEV) return null;

  if (await probeProxy()) {
    const port = import.meta.env.VITE_API_PORT || '8080';
    resolvedPort = String(port);
    sessionStorage.setItem('topik_dev_api_port', resolvedPort);
    return resolvedPort;
  }

  const cached = sessionStorage.getItem('topik_dev_api_port');
  if (cached && (await probePort(cached))) {
    resolvedPort = cached;
    return cached;
  }

  const envPort = import.meta.env.VITE_API_PORT;
  if (envPort && (await probePort(envPort))) {
    resolvedPort = String(envPort);
    sessionStorage.setItem('topik_dev_api_port', resolvedPort);
    return resolvedPort;
  }

  for (const port of DEV_PORTS) {
    if (await probePort(port)) {
      resolvedPort = String(port);
      sessionStorage.setItem('topik_dev_api_port', resolvedPort);
      return resolvedPort;
    }
  }

  resolvedPort = String(import.meta.env.VITE_API_PORT || '8080');
  return resolvedPort;
}

export function getResolvedDevPort() {
  if (resolvedPort) return resolvedPort;
  const cached = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('topik_dev_api_port')
    : null;
  return cached || import.meta.env.VITE_API_PORT || '8080';
}

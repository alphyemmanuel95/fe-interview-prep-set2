import type { Connect, Plugin } from 'vite';
import { advanceDashboard, createInitialState } from './dashboardData.ts';

// Served by Vite itself (dev and preview) so the dashboard makes real HTTP requests that show up
// in the browser's Network tab, without adding a separate backend process or dependency.
export const DASHBOARD_ROUTE = '/api/dashboard';

const MIN_LATENCY_MS = 300;
const MAX_LATENCY_MS = 1_500;
const HTTP_OK = 200;
const HTTP_METHOD_NOT_ALLOWED = 405;

function createDashboardMiddleware(): Connect.NextHandleFunction {
  let state = createInitialState();

  return (request, response) => {
    if (request.method !== 'GET') {
      response.statusCode = HTTP_METHOD_NOT_ALLOWED;
      response.setHeader('Allow', 'GET');
      response.end();
      return;
    }

    const latencyMs = MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
    // State only advances when the response is actually sent; a request the client aborted
    // (tab hidden, unmount) closes the socket early and clears the pending timer.
    const timeoutId = setTimeout(() => {
      state = advanceDashboard(state, Math.random, new Date());
      response.statusCode = HTTP_OK;
      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify(state.payload));
    }, latencyMs);
    response.on('close', () => {
      clearTimeout(timeoutId);
    });
  };
}

export function dashboardApi(): Plugin {
  const middleware = createDashboardMiddleware();
  return {
    name: 'mock-dashboard-api',
    configureServer(server) {
      server.middlewares.use(DASHBOARD_ROUTE, middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(DASHBOARD_ROUTE, middleware);
    },
  };
}

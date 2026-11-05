import { apiRequest } from './api';

/*
 * =========================================================
 * PUBLIC APP SETTINGS  (GET /config)
 * =========================================================
 *
 * onlinePaymentsEnabled: false when Admin turned PayMongo off
 * on the server (ONLINE_PAYMENTS_ENABLED=false). Checkout
 * then shows only cash options.
 * =========================================================
 */

export type AppConfig = {
  onlinePaymentsEnabled: boolean;
};

export const getAppConfig = async (): Promise<AppConfig> => {
  try {
    const response = await apiRequest<{ success: boolean; data: AppConfig }>('/config', { method: 'GET' });
    return { onlinePaymentsEnabled: response.data?.onlinePaymentsEnabled !== false };
  } catch {
    // Older server or offline: keep the option; the server still decides at checkout
    return { onlinePaymentsEnabled: true };
  }
};

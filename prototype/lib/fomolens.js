/**
 * Server-side Fomolens boundary. Keep this module free of browser imports so
 * an API key can only be read by the server adapter.
 */
export const exampleTrader = {
  subject: 'example_trader', name: 'Example Trader', wallets: [
    { chain: 'solana', address: '7xKp…91mQ' },
    { chain: 'evm', address: '0x8a4f…e21B' }
  ], pnl: { '24h': 125, '7d': 125, '30d': 842, all: 3210 }
};

export function createFomolensProvider({ baseUrl = 'https://api.fomolens.app', key = process.env.FOMOLENS_KEY } = {}) {
  const request = async (path, options = {}) => {
    if (!key) throw new Error('FOMOLENS_KEY is not configured');
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${key}`, 'Idempotency-Key': options.idempotencyKey || `lens-atlas-${Date.now()}` }
    });
    if (!response.ok) throw new Error(`Fomolens request failed: ${response.status}`);
    return response.json();
  };
  return {
    request,
    profile: subject => request(`/api/v1/users/${encodeURIComponent(subject)}`),
    wallets: subject => request(`/api/v1/users/${encodeURIComponent(subject)}/wallets`),
    following: subject => request(`/api/v1/users/${encodeURIComponent(subject)}/following`),
    pnl: (subject, window = '7d') => request(`/api/v1/users/${encodeURIComponent(subject)}/pnl?window=${window}`),
    leaderboard: (window = '7d', page = 1) => request(`/api/v1/leaderboard?window=${window}&page=${page}`)
  };
}

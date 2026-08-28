export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/state') {
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS shared_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL)').run();
      if (request.method === 'GET') {
        const row = await env.DB.prepare('SELECT data FROM shared_state WHERE id = 1').first();
        return row ? new Response(row.data, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }) : new Response(null, { status: 404 });
      }
      if (request.method === 'PUT') {
        const data = await request.text();
        if (!data || data.length > 3_000_000) return new Response('Dati non validi.', { status: 400 });
        JSON.parse(data);
        await env.DB.prepare('INSERT INTO shared_state (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at').bind(data, new Date().toISOString()).run();
        return new Response(null, { status: 204 });
      }
      return new Response('Metodo non consentito.', { status: 405 });
    }
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  }
};

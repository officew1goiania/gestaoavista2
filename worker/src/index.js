export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Remove a barra inicial para obter a chave do arquivo (ex: "/dados_extraidos.csv" -> "dados_extraidos.csv")
    const key = decodeURIComponent(url.pathname.slice(1));

    // Permite CORS Preflight (requisições OPTIONS automáticas dos navegadores)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Apenas requisições GET são permitidas
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Lista de arquivos válidos para serem expostos pelo proxy (segurança contra vazamento de outros dados do bucket)
    const allowedFiles = [
      'dados_extraidos.csv',
      'dados_semana.csv',
      'ranking_muapd.csv',
      'ranking_ap.csv',
      'ranking_pp.csv',
      'historico_muapd.json',
      'last_update.txt'
    ];

    if (!allowedFiles.includes(key)) {
      return new Response('File Not Allowed or Not Found', { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    try {
      // Busca o arquivo no R2 usando o binding configurado
      const object = await env.R2_BUCKET.get(key);

      if (object === null) {
        return new Response('File Not Found in Bucket', { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      
      // Habilita CORS para permitir requisições de outros domínios
      headers.set('Access-Control-Allow-Origin', '*');
      
      // Cache-Control configurado para evitar cache no navegador e intermediários
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

      // Força o Content-Type correto caso o R2 não o tenha inferido corretamente
      if (key.endsWith('.csv')) {
        headers.set('Content-Type', 'text/csv; charset=utf-8');
      } else if (key.endsWith('.json')) {
        headers.set('Content-Type', 'application/json; charset=utf-8');
      } else if (key.endsWith('.txt')) {
        headers.set('Content-Type', 'text/plain; charset=utf-8');
      }

      return new Response(object.body, {
        headers,
      });
    } catch (e) {
      return new Response(`Error: ${e.message}`, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  },
};

// Função da Vercel: diz se o canal da Twitch está ao vivo.
// Precisa das variáveis de ambiente TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET
// (app criado em https://dev.twitch.tv/console/apps).
// A resposta fica 60s no cache da Vercel, então a Twitch é consultada
// no máximo ~1x por minuto, não importa quantas pessoas abram o site.

declare const process: { env: Record<string, string | undefined> };

const CANAL = 'pvzra';

let token: { valor: string; expira: number } | null = null;

async function pegarToken(id: string, segredo: string) {
  if (token && Date.now() < token.expira) return token.valor;
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: segredo,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`token da Twitch falhou: ${res.status}`);
  const dados = (await res.json()) as { access_token: string; expires_in: number };
  // renova 5 min antes de expirar
  token = { valor: dados.access_token, expira: Date.now() + (dados.expires_in - 300) * 1000 };
  return token.valor;
}

function responder(corpo: object, cacheSeg: number) {
  return new Response(JSON.stringify(corpo), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${cacheSeg}, stale-while-revalidate=${cacheSeg}`,
    },
  });
}

export async function GET() {
  const id = process.env.TWITCH_CLIENT_ID;
  const segredo = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !segredo) return responder({ live: false, erro: 'sem credenciais' }, 60);

  try {
    let res: Response | null = null;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const acesso = await pegarToken(id, segredo);
      res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${CANAL}`, {
        headers: { 'Client-Id': id, Authorization: `Bearer ${acesso}` },
      });
      if (res.status !== 401) break;
      token = null; // token revogado/expirado: pega outro e tenta de novo
    }
    if (!res || !res.ok) throw new Error(`Twitch respondeu ${res?.status}`);

    const { data } = (await res.json()) as {
      data: { type: string; title: string; game_name: string; viewer_count: number }[];
    };
    const stream = data.find((s) => s.type === 'live');
    return responder(
      stream
        ? { live: true, titulo: stream.title, jogo: stream.game_name, espectadores: stream.viewer_count }
        : { live: false },
      60
    );
  } catch (e) {
    console.error(e);
    // em caso de falha, cache curto pra tentar de novo logo
    return responder({ live: false, erro: 'falha ao consultar a Twitch' }, 15);
  }
}

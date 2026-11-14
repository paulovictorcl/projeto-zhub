// Utilitários compartilhados pelas funções da API.
// Arquivos que começam com "_" não viram rota na Vercel.
import { neon } from '@neondatabase/serverless';

declare const process: { env: Record<string, string | undefined> };

export const sql = neon(process.env.DATABASE_URL ?? '');

let tabelaPronta = false;
export async function garantirTabela() {
  if (tabelaPronta) return;
  await sql`
    CREATE TABLE IF NOT EXISTS itens (
      id          SERIAL PRIMARY KEY,
      titulo      TEXT NOT NULL,
      tipo        TEXT NOT NULL CHECK (tipo IN ('jogo', 'filme')),
      tier        TEXT NOT NULL CHECK (tier IN ('S', 'A', 'B', 'C')),
      status      TEXT NOT NULL DEFAULT '',
      data        TEXT NOT NULL DEFAULT '',
      comentario  TEXT NOT NULL DEFAULT '',
      capa        TEXT NOT NULL DEFAULT '',
      criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  tabelaPronta = true;
}

export function json(corpo: unknown, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cache },
  });
}

// compara a senha enviada com ADMIN_SENHA sem vazar tempo de comparação
async function hash(txt: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)));
}
export async function senhaConfere(enviada: string | null) {
  const certa = process.env.ADMIN_SENHA;
  if (!certa || !enviada) return false;
  const [a, b] = await Promise.all([hash(enviada), hash(certa)]);
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
  return dif === 0;
}

export async function exigirAdmin(request: Request) {
  if (await senhaConfere(request.headers.get('x-admin-senha'))) return null;
  await new Promise((r) => setTimeout(r, 400)); // freia tentativas em série
  return json({ erro: 'não autorizado' }, 401);
}

export type Item = {
  titulo: string;
  tipo: 'jogo' | 'filme';
  tier: 'S' | 'A' | 'B' | 'C';
  status: string;
  data: string;
  comentario: string;
  capa: string;
};

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// valida e limpa um item vindo do painel; devolve null se for inválido
export function validarItem(bruto: unknown): Item | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const o = bruto as Record<string, unknown>;
  const titulo = texto(o.titulo, 200);
  const tipo = o.tipo === 'jogo' || o.tipo === 'filme' ? o.tipo : null;
  const tier = ['S', 'A', 'B', 'C'].includes(o.tier as string) ? (o.tier as Item['tier']) : null;
  let capa = texto(o.capa, 1000);
  if (capa && !/^https?:\/\//i.test(capa)) capa = '';
  if (!titulo || !tipo || !tier) return null;
  return {
    titulo,
    tipo,
    tier,
    status: texto(o.status, 80),
    data: texto(o.data, 40),
    comentario: texto(o.comentario, 600),
    capa,
  };
}

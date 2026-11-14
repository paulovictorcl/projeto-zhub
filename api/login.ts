// POST /api/login  { senha }  → 200 se bater com ADMIN_SENHA, 401 se não
import { json, senhaConfere } from './_lib.js';

export async function POST(request: Request) {
  let senha: string | null = null;
  try {
    const corpo = (await request.json()) as { senha?: unknown };
    senha = typeof corpo.senha === 'string' ? corpo.senha : null;
  } catch {
    // corpo inválido: cai no "não autorizado"
  }
  if (await senhaConfere(senha)) return json({ ok: true });
  await new Promise((r) => setTimeout(r, 600)); // freia tentativas em série
  return json({ erro: 'senha incorreta' }, 401);
}

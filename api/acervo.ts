// API do acervo
//   GET    /api/acervo           → lista (pública, com cache na Vercel)
//   POST   /api/acervo           → cria um item, ou importa uma lista se o banco estiver vazio (admin)
//   PUT    /api/acervo?id=123    → edita (admin)
//   DELETE /api/acervo?id=123    → exclui (admin)
// As rotas de admin exigem o cabeçalho "x-admin-senha" igual à variável ADMIN_SENHA.
import { sql, garantirTabela, json, exigirAdmin, validarItem } from './_lib.js';

const COLUNAS = sql`id, titulo, tipo, tier, status, data, comentario, capa`;

function pegarId(request: Request) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET() {
  try {
    await garantirTabela();
    const itens = await sql`SELECT ${COLUNAS} FROM itens ORDER BY id DESC`;
    // 15s de cache na Vercel: muita gente abrindo o site = poucas consultas ao banco
    return json(itens, 200, 'public, s-maxage=15, stale-while-revalidate=300');
  } catch (e) {
    console.error(e);
    return json({ erro: 'falha ao ler o acervo' }, 500);
  }
}

export async function POST(request: Request) {
  const negado = await exigirAdmin(request);
  if (negado) return negado;
  try {
    await garantirTabela();
    const corpo = await request.json();

    // importação inicial: só quando o banco ainda está vazio
    if (Array.isArray(corpo)) {
      const [{ total }] = (await sql`SELECT count(*)::int AS total FROM itens`) as { total: number }[];
      if (total > 0) return json({ erro: 'o acervo já tem itens; importação cancelada' }, 409);
      const itens = corpo.map(validarItem).filter((i) => i !== null).slice(0, 500);
      // insere do mais antigo pro mais novo, pra manter a ordem
      for (const i of [...itens].reverse()) {
        await sql`INSERT INTO itens (titulo, tipo, tier, status, data, comentario, capa)
                  VALUES (${i.titulo}, ${i.tipo}, ${i.tier}, ${i.status}, ${i.data}, ${i.comentario}, ${i.capa})`;
      }
      const lista = await sql`SELECT ${COLUNAS} FROM itens ORDER BY id DESC`;
      return json(lista, 201);
    }

    const item = validarItem(corpo);
    if (!item) return json({ erro: 'dados inválidos' }, 400);
    const [novo] = await sql`
      INSERT INTO itens (titulo, tipo, tier, status, data, comentario, capa)
      VALUES (${item.titulo}, ${item.tipo}, ${item.tier}, ${item.status}, ${item.data}, ${item.comentario}, ${item.capa})
      RETURNING ${COLUNAS}`;
    return json(novo, 201);
  } catch (e) {
    console.error(e);
    return json({ erro: 'falha ao salvar' }, 500);
  }
}

export async function PUT(request: Request) {
  const negado = await exigirAdmin(request);
  if (negado) return negado;
  const id = pegarId(request);
  if (!id) return json({ erro: 'id inválido' }, 400);
  try {
    await garantirTabela();
    const item = validarItem(await request.json());
    if (!item) return json({ erro: 'dados inválidos' }, 400);
    const [atualizado] = await sql`
      UPDATE itens SET titulo = ${item.titulo}, tipo = ${item.tipo}, tier = ${item.tier},
        status = ${item.status}, data = ${item.data}, comentario = ${item.comentario}, capa = ${item.capa}
      WHERE id = ${id}
      RETURNING ${COLUNAS}`;
    return atualizado ? json(atualizado) : json({ erro: 'item não encontrado' }, 404);
  } catch (e) {
    console.error(e);
    return json({ erro: 'falha ao salvar' }, 500);
  }
}

export async function DELETE(request: Request) {
  const negado = await exigirAdmin(request);
  if (negado) return negado;
  const id = pegarId(request);
  if (!id) return json({ erro: 'id inválido' }, 400);
  try {
    await garantirTabela();
    await sql`DELETE FROM itens WHERE id = ${id}`;
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ erro: 'falha ao excluir' }, 500);
  }
}

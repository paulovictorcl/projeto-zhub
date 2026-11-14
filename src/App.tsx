import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ItemAcervo {
  id: number;
  titulo: string;
  tipo: 'jogo' | 'filme';
  tier: 'S' | 'A' | 'B' | 'C';
  status: string;
  data: string;
  comentario: string;
  capa: string;
}

// Logo com efeito de digitação (igual à vinheta de transição)
const LOGO_LETRAS = ['p', 'v', 'z', 'r', 'a'];
const LOGO_TOTAL = LOGO_LETRAS.length + 1; // + o ponto
const DIGITA_MS = 110; // tempo por caractere ao digitar
const APAGA_MS = 45; // tempo por caractere ao apagar
const CURSOR_FINAL_MS = 2200; // cursor piscando depois de terminar
const REPETE_MS = 20000; // intervalo entre uma digitação e outra

function LogoDigitando({ tamanho = 'text-6xl' }: { tamanho?: string }) {
  const [visiveis, setVisiveis] = useState(0);
  const [cursor, setCursor] = useState<'digitando' | 'piscando' | 'oculto'>(
    'piscando'
  );

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisiveis(LOGO_TOTAL);
      setCursor('oculto');
      return;
    }

    const timers: number[] = [];
    const agenda = (fn: () => void, ms: number) =>
      timers.push(window.setTimeout(fn, ms));

    const digitar = (n: number) => {
      setCursor('digitando');
      setVisiveis(n);
      if (n < LOGO_TOTAL) {
        agenda(() => digitar(n + 1), DIGITA_MS);
      } else {
        setCursor('piscando');
        agenda(() => setCursor('oculto'), CURSOR_FINAL_MS);
        agenda(() => apagar(LOGO_TOTAL), REPETE_MS);
      }
    };

    const apagar = (n: number) => {
      setCursor('digitando');
      setVisiveis(n);
      if (n > 0) agenda(() => apagar(n - 1), APAGA_MS);
      else agenda(() => digitar(1), 500);
    };

    // começa com o cursor piscando sozinho, como na vinheta
    agenda(() => digitar(1), 700);
    return () => timers.forEach(clearTimeout);
  }, []);

  const cursorEl = (
    <span className="relative inline-block w-0" aria-hidden="true">
      <span
        className={`absolute left-[0.04em] bottom-[-0.08em] w-[0.06em] h-[0.95em] bg-teal shadow-[0_0_8px_#0dbb95] ${
          cursor === 'piscando' ? 'logo-cursor-pisca' : ''
        } ${cursor === 'oculto' ? 'opacity-0' : ''}`}
      />
    </span>
  );

  return (
    <div
      className={`font-bold ${tamanho} tracking-[-0.03em] leading-none`}
      role="img"
      aria-label="pvzra."
    >
      <span aria-hidden="true">
        {LOGO_LETRAS.map((l, i) => (
          <React.Fragment key={i}>
            {visiveis === i && cursorEl}
            <span
              className={`${l === 'z' ? 'text-teal' : ''} ${
                i < visiveis ? '' : 'invisible'
              }`}
            >
              {l}
            </span>
          </React.Fragment>
        ))}
        {visiveis === LOGO_LETRAS.length && cursorEl}
        <span
          className={`inline-block w-[0.2em] h-[0.2em] ml-[0.05em] bg-teal ${
            visiveis >= LOGO_TOTAL ? '' : 'invisible'
          }`}
        />
        {visiveis >= LOGO_TOTAL && cursorEl}
      </span>
    </div>
  );
}

const estaNoAdmin = () => /^\/admin\/?$/.test(window.location.pathname);

const prefereMenosMovimento = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Status da live (consulta /api/live, que pergunta à Twitch) ----------
type StatusLive = { live: boolean; titulo?: string; jogo?: string };

function useStatusLive() {
  const [status, setStatus] = useState<StatusLive | null>(null); // null = ainda não sabe

  useEffect(() => {
    // pra testar o visual: ?live=1 (aceso) ou ?live=0 (apagado)
    const forcado = new URLSearchParams(window.location.search).get('live');
    if (forcado === '1' || forcado === '0') {
      setStatus({ live: forcado === '1', titulo: 'Teste de status' });
      return;
    }

    let ativo = true;
    const consulta = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/live');
        const dados = (await res.json()) as StatusLive;
        if (ativo) setStatus(dados);
      } catch {
        // sem a função (ex.: rodando só com o Vite) ou sem rede: trata como offline
        if (ativo) setStatus({ live: false });
      }
    };
    consulta();
    const intervalo = window.setInterval(consulta, 60_000);
    document.addEventListener('visibilitychange', consulta);
    return () => {
      ativo = false;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', consulta);
    };
  }, []);

  return status;
}

function BotaoAoVivo() {
  const status = useStatusLive();
  const aoVivo = status?.live === true;
  const dica = aoVivo
    ? [status?.titulo, status?.jogo].filter(Boolean).join(' · ') || 'Ao vivo agora'
    : 'Offline no momento';

  return (
    <a
      href="https://twitch.tv/pvzra"
      target="_blank"
      rel="noreferrer"
      title={dica}
      className={`inline-flex items-center gap-2 font-mono text-xs font-medium px-4 py-2 rounded-full border transition-all duration-500 ${
        aoVivo
          ? 'bg-teal/15 border-teal/50 text-teal-light shadow-[0_0_22px_rgba(13,187,149,0.3)] hover:bg-teal hover:text-[#03201a]'
          : 'bg-white/[0.03] border-white/[0.08] text-dim hover:text-mute hover:border-white/20'
      } ${status === null ? 'opacity-0' : 'opacity-100'}`}
    >
      <span className="relative flex w-2 h-2" aria-hidden="true">
        {aoVivo && (
          <span className="absolute inset-0 rounded-full bg-teal-light opacity-75 animate-ping" />
        )}
        <span
          className={`relative w-2 h-2 rounded-full ${
            aoVivo ? 'bg-teal-light shadow-[0_0_8px_#46e3be]' : 'bg-dim'
          }`}
        />
      </span>
      {aoVivo ? 'ao vivo' : 'offline'}
    </a>
  );
}

// ---------- Editor de código que se digita ----------
type Token = [keyof typeof corToken, string];
const corToken = {
  f: 'text-ink',
  p: 'text-[#c4d0cd]',
  k: 'text-teal-light',
  s: 'text-[#ffc773]',
  n: 'text-[#8fb8ff]',
  c: 'text-dim',
};
let editorJaDigitou = false; // 1ª digitação espera a logo; trocas de aba são imediatas

function EditorCodigo({
  linhas,
  aoAparecer = false,
  quebrarLinha = false,
}: {
  linhas: Token[][];
  aoAparecer?: boolean; // só começa a digitar quando o box entra na tela
  quebrarLinha?: boolean;
}) {
  const caixaRef = useRef<HTMLDivElement | null>(null);
  const [visivel, setVisivel] = useState(!aoAparecer);
  // cada caractere é um passo; cada quebra de linha também
  const total = linhas.reduce(
    (soma, l, i) =>
      soma + l.reduce((a, [, t]) => a + t.length, 0) + (i < linhas.length - 1 ? 1 : 0),
    0
  );
  const [passo, setPasso] = useState(0);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (visivel) return;
    const el = caixaRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visivel]);

  useEffect(() => {
    if (prefereMenosMovimento()) {
      setPronto(true);
      return;
    }
    if (!visivel) return;
    // o editor do topo espera a logo; os de baixo digitam assim que aparecem
    const primeira = aoAparecer || !editorJaDigitou;
    const atraso = aoAparecer ? 350 : primeira ? 1400 : 120;
    if (!aoAparecer) editorJaDigitou = true;
    const posQuebras = new Set<number>();
    let acc = 0;
    linhas.forEach((l, i) => {
      acc += l.reduce((a, [, t]) => a + t.length, 0);
      if (i < linhas.length - 1) posQuebras.add(acc++);
    });

    let i = 0;
    let timer = 0;
    const avanca = () => {
      i++;
      setPasso(i);
      if (i >= total) return setPronto(true);
      const pausa = posQuebras.has(i) ? 140 : (primeira ? 24 : 14) + Math.random() * 22;
      timer = window.setTimeout(avanca, pausa);
    };
    timer = window.setTimeout(avanca, atraso);
    return () => clearTimeout(timer);
    // a aba é trocada via `key`, então basta rodar na montagem (ou ao aparecer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel]);

  const n = pronto ? Infinity : passo;
  const cursor = (
    <span className="relative inline-block w-0 align-baseline" aria-hidden="true">
      <span
        className={`absolute left-px bottom-[-0.2em] w-[2px] h-[1.15em] bg-teal-light shadow-[0_0_8px_rgba(70,227,190,0.6)] ${
          pronto || passo === 0 ? 'logo-cursor-pisca' : ''
        }`}
      />
    </span>
  );
  const ultimo = pronto ? total : passo;

  let pos = 0;
  return (
    <div ref={caixaRef} className="p-4 leading-relaxed select-none" aria-label="código ilustrativo">
      <div className="space-y-1">
        {linhas.map((linha, li) => {
          const inicioLinha = pos;
          const partes = linha.map(([cls, txt], ti) => {
            const ini = pos;
            pos += txt.length;
            const vis = Math.max(0, Math.min(txt.length, n - ini));
            const temCursor = ultimo >= ini && ultimo < ini + txt.length;
            return (
              <span key={ti} className={corToken[cls]}>
                {txt.slice(0, vis)}
                {temCursor && cursor}
                <span className="invisible">{txt.slice(vis)}</span>
              </span>
            );
          });
          const fimLinha = pos;
          if (li < linhas.length - 1) pos++; // a quebra de linha
          const cursorNoFim = ultimo === fimLinha;
          return (
            <div
              key={li}
              className={`${quebrarLinha ? 'whitespace-pre-wrap' : 'whitespace-pre'} min-h-[1.25em]`}
            >
              <span className={`text-white/20 mr-4 ${n >= inicioLinha ? '' : 'invisible'}`}>
                {li + 1}
              </span>
              {partes}
              {cursorNoFim && cursor}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Fundo: grade em camadas, luz passeando e pulsos nas linhas ----------
const GRADE = 96; // espaçamento da grade maior (px)

function FundoGrade() {
  const movRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefereMenosMovimento()) return;
    const mov = movRef.current;
    if (!mov) return;
    let timer = 0;
    let ativos = 0;

    const dispara = () => {
      timer = window.setTimeout(dispara, 2600 + Math.random() * 3200);
      if (ativos >= 3 || document.hidden) return;
      // a camada tem 2× a tela; a parte visível fica mais ou menos no miolo
      const W = mov.offsetWidth;
      const H = mov.offsetHeight;
      const horizontal = Math.random() < 0.5;
      const sentido = Math.random() < 0.5 ? 1 : -1;
      const tam = 160 + Math.random() * 140;
      const faixa = horizontal ? H : W;
      const linha = Math.round((faixa * (0.32 + Math.random() * 0.36)) / GRADE) * GRADE;
      const de = (horizontal ? W : H) * 0.18;
      const ate = (horizontal ? W : H) * 0.82;
      const [a, b] = sentido > 0 ? [de - tam, ate] : [ate, de - tam];

      const el = document.createElement('i');
      el.className = `pulso-grade ${horizontal ? 'h' : 'v'}${sentido < 0 ? ' rev' : ''}`;
      el.style.setProperty(horizontal ? 'top' : 'left', `${linha}px`);
      el.style.setProperty(horizontal ? 'width' : 'height', `${tam}px`);
      mov.appendChild(el);
      ativos++;

      const eixo = horizontal ? 'translateX' : 'translateY';
      const anim = el.animate(
        [
          { transform: `${eixo}(${a}px)`, opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { opacity: 1, offset: 0.85 },
          { transform: `${eixo}(${b}px)`, opacity: 0 },
        ],
        { duration: (Math.abs(b - a) / (0.35 + Math.random() * 0.25)), easing: 'linear' }
      );
      anim.onfinish = () => {
        el.remove();
        ativos--;
      };
    };

    timer = window.setTimeout(dispara, 1200);
    return () => {
      clearTimeout(timer);
      mov.querySelectorAll('.pulso-grade').forEach((e) => e.remove());
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none grade-mascara">
      <div className="grade-rot">
        <div ref={movRef} className="grade-mov">
          <div className="absolute inset-0 grade-fina" />
          <div className="absolute inset-0 grade-maior" />
          <div className="absolute inset-0 grade-acesa" />
        </div>
      </div>
    </div>
  );
}

// ---------- Catálogo ----------
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "out 2026" -> número comparável (ano * 12 + mês); datas fora do padrão vão pro fim
function valorData(data: string) {
  const [mes, ano] = data.trim().toLowerCase().split(/\s+/);
  const m = MESES.indexOf(mes?.slice(0, 3) ?? '');
  const a = Number(ano);
  if (m < 0 || !Number.isFinite(a)) return -1;
  return a * 12 + m;
}

function CartaoPoster({ item }: { item: ItemAcervo }) {
  const tier = estiloTier[item.tier];
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -6 }}
      className="rounded-[20px] overflow-hidden bg-[#0c1616]/60 border border-white/[0.08] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] hover:border-teal/40 transition-colors group flex flex-col"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#05090a]">
        <img
          src={item.capa}
          alt={item.titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05090a] via-[#05090a]/20 to-transparent opacity-90" />

        <span
          className={`absolute top-3 right-3 font-mono text-[11px] font-medium px-2.5 py-1 rounded-full border backdrop-blur-md flex items-center gap-1.5 ${tier.bg}`}
        >
          <i className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
          TIER {item.tier}
        </span>

        <span className="absolute bottom-3 left-3 right-3 font-mono text-[10px] text-[#d3ebe5] bg-[#05090a]/85 border border-white/10 backdrop-blur-md px-2.5 py-1 rounded-md truncate w-fit max-w-[90%]">
          {item.status}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="font-mono text-[10px] text-dim uppercase">
              {item.tipo === 'jogo' ? '🎮 Jogo' : '🍿 Filme'}
            </span>
            <span className="font-mono text-[10px] text-dim">
              {item.data}
            </span>
          </div>
          <h3 className="font-bold text-base tracking-[-0.02em] text-ink group-hover:text-teal-light transition-colors leading-snug">
            {item.titulo}
          </h3>
          <p className="mt-1.5 text-mute font-light text-xs leading-relaxed line-clamp-3">
            {item.comentario}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

function SecaoAcervo({
  id,
  titulo,
  itens,
  vazio,
  extra,
  carregando = false,
}: {
  id?: string;
  titulo: string;
  itens: ItemAcervo[];
  vazio: string;
  extra?: React.ReactNode;
  carregando?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4 mb-8">
        <h2 className="font-mono text-sm font-normal text-mute">
          <span className="text-teal mr-1.5">//</span>
          {titulo}
          <span className="ml-2 text-xs text-dim">
            {carregando ? '(carregando…)' : `(${itens.length} ${itens.length === 1 ? 'item' : 'itens'})`}
          </span>
        </h2>
        {extra}
      </div>

      {carregando ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[20px] overflow-hidden bg-[#0c1616]/60 border border-white/[0.08] animate-pulse"
            >
              <div className="aspect-[2/3] bg-white/[0.03]" />
              <div className="p-4 space-y-2">
                <div className="h-2 w-1/3 rounded bg-white/[0.06]" />
                <div className="h-3 w-3/4 rounded bg-white/[0.08]" />
                <div className="h-2 w-full rounded bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      ) : itens.length === 0 ? (
        <p className="font-mono text-xs text-dim">
          <span className="text-teal/60 mr-1.5">#</span>
          {vazio}
        </p>
      ) : (
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          <AnimatePresence>
            {itens.map((item) => (
              <CartaoPoster key={item.id} item={item} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}

// ---------- Sugestões (vão pro Discord) ----------
// TODO: trocar pelo convite do servidor (ou link direto do canal #sugestões)
const DISCORD_URL = 'https://discord.gg/pvzvMPw';

function SecaoSugestoes() {
  return (
    <section id="sugerir" className="scroll-mt-8">
      <div className="flex items-center border-b border-white/[0.08] pb-4 mb-8">
        <h2 className="font-mono text-sm font-normal text-mute">
          <span className="text-teal mr-1.5">//</span>
          sugerir()
        </h2>
      </div>

      <div className="relative overflow-hidden rounded-[20px] bg-[#0c1616]/60 border border-white/[0.08] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-6 sm:p-10 grid gap-8 lg:grid-cols-12 items-center">
        <div
          className="pointer-events-none absolute -right-24 -top-24 w-80 h-80 rounded-full bg-teal/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative lg:col-span-7">
          <h3 className="leading-tight">
            <span className="block font-extralight text-2xl sm:text-3xl tracking-[-0.03em] text-ink/90">
              Tem um filme ou jogo
            </span>
            <span className="block font-extrabold text-3xl sm:text-4xl tracking-[-0.045em] text-ink">
              pra próxima live?
            </span>
          </h3>
          <p className="mt-4 text-mute font-light text-sm sm:text-base max-w-lg leading-relaxed">
            Manda a sugestão no nosso Discord. O pessoal vota, a gente escolhe, e o
            que rolar na live vem parar aqui no acervo.</p>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex items-center gap-2.5 font-mono text-sm font-medium pl-4 pr-5 py-2.5 rounded-full bg-teal text-[#03201a] shadow-[0_0_24px_rgba(13,187,149,0.35)] hover:bg-teal-light hover:shadow-[0_0_32px_rgba(70,227,190,0.5)] transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
              <path d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.84a13.7 13.7 0 0 0-.63 1.3 18.4 18.4 0 0 0-5.5 0 12.6 12.6 0 0 0-.64-1.3 19.7 19.7 0 0 0-4.93 1.53C.6 9.05-.24 13.6.18 18.1a19.9 19.9 0 0 0 6.04 3.05c.49-.66.92-1.36 1.3-2.1a12.9 12.9 0 0 1-2.04-.98c.17-.12.34-.25.5-.38a14.2 14.2 0 0 0 12.06 0c.17.14.33.26.5.38-.65.39-1.33.71-2.05.98.38.74.81 1.44 1.3 2.1a19.8 19.8 0 0 0 6.05-3.05c.5-5.22-.84-9.73-3.52-13.73ZM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.2 0 2.17 1.1 2.15 2.42 0 1.34-.95 2.42-2.15 2.42Zm7.96 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.2 0 2.17 1.1 2.15 2.42 0 1.34-.94 2.42-2.15 2.42Z" />
            </svg>
            Sugerir no Discord
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="relative lg:col-span-5 rounded-2xl overflow-hidden bg-[#05090a]/70 border border-white/[0.08] font-mono text-xs sm:text-[13px] leading-relaxed">
          <div className="flex items-center h-9 px-3.5 border-b border-white/[0.08] bg-white/[0.02] text-dim">
            <b className="w-2 h-2 rounded-sm bg-teal-light mr-2" />
            <span className="text-[#c4d0cd]">#sugestões</span>
          </div>
          <EditorCodigo
            aoAparecer
            quebrarLinha
            linhas={[
              [['k', 'INSERT INTO'], ['p', ' sugestoes']],
              [['k', 'VALUES'], ['p', ' ('], ['s', "'seu_filme_ou_jogo'"], ['p', ');']],
              [],
              [['c', '-- as sugestões com mais likes, ganham!']],
            ]}
          />
        </div>
      </div>
    </section>
  );
}

const acervoInicial: ItemAcervo[] = [
  {
    id: 1,
    titulo: 'Call of Duty: Modern Warfare 3',
    tipo: 'jogo',
    tier: 'S',
    status: 'Zerado // Spec Ops',
    data: 'out 2026',
    comentario: 'Clássico absoluto, campanha e Spec Ops insanos do início ao fim.',
    capa: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&h=900&q=80',
  },
  {
    id: 2,
    titulo: 'Hell House LLC',
    tipo: 'filme',
    tier: 'A',
    status: 'Cine-Z // Terror',
    data: 'ago 2025',
    comentario: 'Found footage tenso demais, rendeu bons sustos no chat.',
    capa: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&h=900&q=80',
  },
  {
    id: 3,
    titulo: 'Harry Potter e o Prisioneiro de Azkaban',
    tipo: 'filme',
    tier: 'S',
    status: 'Maratona',
    data: 'set 2026',
    comentario: 'O melhor da franquia, fotografia impecável e sem discussão.',
    capa: 'https://images.unsplash.com/photo-1618944847828-82e943c3bdb7?auto=format&fit=crop&w=600&h=900&q=80',
  },
  {
    id: 4,
    titulo: 'Paranormal Activity: Next of Kin',
    tipo: 'filme',
    tier: 'B',
    status: 'Cine-Z // Terror',
    data: 'jul 2025',
    comentario: 'Ambientação boa na fazenda isolada, valeu a madrugada com a galera.',
    capa: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&h=900&q=80',
  },
];

const estiloTier = {
  S: {
    bg: 'bg-[#0dbb95]/20 border-[#0dbb95]/50 text-[#46e3be]',
    dot: 'bg-[#0dbb95] shadow-[0_0_8px_#0dbb95]',
  },
  A: {
    bg: 'bg-[#f0a63a]/20 border-[#f0a63a]/50 text-[#ffc773]',
    dot: 'bg-[#f0a63a] shadow-[0_0_8px_#f0a63a]',
  },
  B: {
    bg: 'bg-[#8fb8ff]/20 border-[#8fb8ff]/50 text-[#8fb8ff]',
    dot: 'bg-[#8fb8ff] shadow-[0_0_8px_#8fb8ff]',
  },
  C: {
    bg: 'bg-[#f2665a]/20 border-[#f2665a]/50 text-[#ff9087]',
    dot: 'bg-[#f2665a] shadow-[0_0_8px_#f2665a]',
  },
};

export default function App() {
  // o acervo vem do banco (via /api/acervo)
  const [itens, setItens] = useState<ItemAcervo[]>([]);
  const [carregando, setCarregando] = useState(true);
  // false quando a API não responde (ex.: rodando só com `npm run dev`)
  const [apiOk, setApiOk] = useState(true);

  const [abaCodigo, setAbaCodigo] = useState<'acervo.py' | 'chat.sql'>('acervo.py');
  const [horario, setHorario] = useState({ data: '', hora: '' });

  // Painel Admin: página própria no endereço /admin
  const [rotaAdmin, setRotaAdmin] = useState(estaNoAdmin);
  // a senha fica só nesta aba (sessionStorage) e vai junto em cada alteração;
  // quem confere é o servidor (variável ADMIN_SENHA na Vercel)
  const [senhaAdmin, setSenhaAdmin] = useState(
    () => sessionStorage.getItem('pvzra_admin_senha') ?? ''
  );
  const autenticado = senhaAdmin !== '';
  const [entrando, setEntrando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [avisoAdmin, setAvisoAdmin] = useState<{ tipo: 'erro' | 'ok'; txt: string } | null>(null);
  const [senhaInput, setSenhaInput] = useState('');
  const [erroSenha, setErroSenha] = useState(false);
  const [msgErroLogin, setMsgErroLogin] = useState('');
  const [tentativas, setTentativas] = useState(0);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // Estados do Formulário
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoTipo, setNovoTipo] = useState<'jogo' | 'filme'>('filme');
  const [novoTier, setNovoTier] = useState<'S' | 'A' | 'B' | 'C'>('S');
  const [novoStatus, setNovoStatus] = useState('Cine-Z');
  const [novaData, setNovaData] = useState('');
  const [novaCapa, setNovaCapa] = useState('');
  const [novoComentario, setNovoComentario] = useState('');

  // Estado da Busca na API
  const [buscandoCapa, setBuscandoCapa] = useState(false);

  // acompanha o voltar/avançar do navegador entre o site e o /admin
  useEffect(() => {
    const onPop = () => setRotaAdmin(estaNoAdmin());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.title = rotaAdmin ? 'Painel de Admin.' : 'Painel de Admin.';
    window.scrollTo(0, 0);
  }, [rotaAdmin]);

  const irParaSite = (e?: React.MouseEvent) => {
    e?.preventDefault();
    window.history.pushState(null, '', '/');
    setRotaAdmin(false);
  };

  // carrega o acervo (no painel, pula o cache pra ver o estado mais recente)
  useEffect(() => {
    let ativo = true;
    const url = rotaAdmin ? `/api/acervo?t=${Date.now()}` : '/api/acervo';
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((dados: ItemAcervo[]) => {
        if (!Array.isArray(dados)) throw new Error('resposta inválida');
        if (ativo) {
          setItens(dados);
          setApiOk(true);
        }
      })
      .catch(() => {
        // sem API: mostra os exemplos, só pra visualização
        if (ativo) {
          setItens(acervoInicial);
          setApiOk(false);
        }
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [rotaAdmin]);

  const sair = () => {
    limparFormulario();
    setSenhaAdmin('');
    sessionStorage.removeItem('pvzra_admin_senha');
  };

  // chamada autenticada à API; se a senha deixar de valer, desloga
  const chamarApi = async (metodo: string, url: string, corpo?: unknown) => {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'x-admin-senha': senhaAdmin },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    if (res.status === 401) {
      sair();
      throw new Error('Sessão expirada: entre de novo.');
    }
    const dados = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(dados.erro || `Erro ${res.status}`);
    return dados;
  };

  const avisar = (tipo: 'erro' | 'ok', txt: string) => {
    setAvisoAdmin({ tipo, txt });
    window.setTimeout(() => setAvisoAdmin((a) => (a?.txt === txt ? null : a)), 4000);
  };

  useEffect(() => {
    const atualizarRelogio = () => {
      const d = new Date();
      const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
      const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      setHorario({
        data: `${dias[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${meses[d.getMonth()]}`,
        hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      });
    };
    atualizarRelogio();
    const timer = setInterval(atualizarRelogio, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaInput || entrando) return;
    setEntrando(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: senhaInput }),
      });
      if (res.ok) {
        setSenhaAdmin(senhaInput);
        sessionStorage.setItem('pvzra_admin_senha', senhaInput);
        setErroSenha(false);
        setSenhaInput('');
      } else {
        setMsgErroLogin(
          res.status === 401 ? 'chave incorreta, tenta de novo.' : 'servidor indisponível no momento.'
        );
        setErroSenha(true);
        setTentativas((t) => t + 1);
      }
    } catch {
      setMsgErroLogin('sem conexão com o servidor.');
      setErroSenha(true);
      setTentativas((t) => t + 1);
    } finally {
      setEntrando(false);
    }
  };

  const limparFormulario = () => {
    setEditandoId(null);
    setNovoTitulo('');
    setNovoTipo('filme');
    setNovoTier('S');
    setNovoStatus('Cine-Z');
    setNovaData('nov 2026');
    setNovaCapa('');
    setNovoComentario('');
  };

  const handleIniciarEdicao = (item: ItemAcervo) => {
    setEditandoId(item.id);
    setNovoTitulo(item.titulo);
    setNovoTipo(item.tipo);
    setNovoTier(item.tier);
    setNovoStatus(item.status);
    setNovaData(item.data);
    setNovaCapa(item.capa);
    setNovoComentario(item.comentario);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buscarCapaAutomatica = async () => {
    if (!novoTitulo.trim()) return;
    setBuscandoCapa(true);
    
    try {
      if (novoTipo === 'filme') {
        const TMDB_API_KEY = 'e1b00c94ace58cf5ac807d8f5139253c'; 
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(novoTitulo)}&language=pt-BR`
        );
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          const caminhoPoster = data.results[0].poster_path;
          if (caminhoPoster) {
            setNovaCapa(`https://image.tmdb.org/t/p/w600_and_h900_bestv2${caminhoPoster}`);
            setNovoTitulo(data.results[0].title);
          } else {
            alert('Filme encontrado, mas ele não possui um pôster cadastrado no TMDB.');
          }
        } else {
          alert('Nenhum filme encontrado com esse nome. Verifique a digitação!');
        }
      } 
      
      else if (novoTipo === 'jogo') {
        const RAWG_API_KEY = 'e90faf26f4e044bb91c1eeaafc840a2d';

        const res = await fetch(
          `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(novoTitulo)}&page_size=1`
        );
        const data = await res.json();

        if (data.results && data.results.length > 0) {
          const jogo = data.results[0];
          if (jogo.background_image) {
            setNovaCapa(jogo.background_image);
            setNovoTitulo(jogo.name);
          } else {
            alert('Jogo encontrado, mas sem imagem cadastrada no RAWG.');
          }
        } else {
          alert('Nenhum jogo encontrado com esse nome. Verifique a digitação!');
        }
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão ao buscar a capa.');
    } finally {
      setBuscandoCapa(false);
    }
  };

  const handleSalvarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim() || salvando) return;

    const dados = {
      titulo: novoTitulo,
      tipo: novoTipo,
      tier: novoTier,
      status: novoStatus || (novoTipo === 'jogo' ? 'Zerado em Live' : 'Assistido em Live'),
      data: novaData || 'nov 2026',
      comentario: novoComentario || 'Sem comentários adicionais.',
      capa:
        novaCapa.trim() ||
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&h=900&q=80',
    };

    setSalvando(true);
    try {
      if (editandoId !== null) {
        const salvo: ItemAcervo = await chamarApi('PUT', `/api/acervo?id=${editandoId}`, dados);
        setItens((lista) => lista.map((i) => (i.id === salvo.id ? salvo : i)));
        avisar('ok', 'Alterações salvas.');
      } else {
        const novo: ItemAcervo = await chamarApi('POST', '/api/acervo', dados);
        setItens((lista) => [novo, ...lista]);
        avisar('ok', 'Adicionado ao acervo.');
      }
      limparFormulario();
    } catch (err) {
      avisar('erro', (err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemoverItem = async (item: ItemAcervo) => {
    if (!window.confirm(`Excluir "${item.titulo}" do acervo?`)) return;
    try {
      await chamarApi('DELETE', `/api/acervo?id=${item.id}`);
      if (editandoId === item.id) limparFormulario();
      setItens((lista) => lista.filter((i) => i.id !== item.id));
      avisar('ok', 'Item excluído.');
    } catch (err) {
      avisar('erro', (err as Error).message);
    }
  };

  // primeira carga do banco: envia o que estava salvo neste navegador (ou os exemplos)
  const importarAcervoInicial = async () => {
    let base: ItemAcervo[] = acervoInicial;
    try {
      const salvo = JSON.parse(localStorage.getItem('pvzra_acervo_v2') || 'null');
      if (Array.isArray(salvo) && salvo.length) base = salvo;
    } catch {
      // ignora e usa os exemplos
    }
    setSalvando(true);
    try {
      const lista: ItemAcervo[] = await chamarApi('POST', '/api/acervo', base);
      setItens(lista);
      avisar('ok', `${lista.length} itens importados pro banco.`);
    } catch (err) {
      avisar('erro', (err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const porRecencia = [...itens].sort(
    (a, b) => valorData(b.data) - valorData(a.data) || b.id - a.id
  );
  const atividadeRecente = porRecencia.slice(0, 4);
  const jogos = porRecencia.filter((i) => i.tipo === 'jogo');
  const filmes = porRecencia.filter((i) => i.tipo === 'filme');

  const totalJogos = itens.filter((i) => i.tipo === 'jogo').length;
  const totalFilmes = itens.filter((i) => i.tipo === 'filme').length;

  // ================= Página /admin =================
  const campo =
    'w-full px-3.5 py-2.5 rounded-xl bg-[#05090a]/80 border border-white/10 text-sm text-ink placeholder:text-dim focus:outline-none focus:border-teal/70 focus:ring-2 focus:ring-teal/15 transition';
  const rotulo = 'block font-mono text-[11px] text-mute mb-1.5';

  if (rotaAdmin) {
    const previa: ItemAcervo = {
      id: editandoId ?? 0,
      titulo: novoTitulo || 'Título da obra',
      tipo: novoTipo,
      tier: novoTier,
      status: novoStatus || (novoTipo === 'jogo' ? 'Zerado em Live' : 'Assistido em Live'),
      data: novaData || 'nov 2026',
      comentario: novoComentario || 'O comentário rápido aparece aqui.',
      capa:
        novaCapa.trim() ||
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&h=900&q=80',
    };

    return (
      <div className="relative min-h-screen bg-bg text-ink font-sans selection:bg-teal selection:text-bg">
        <div className="fixed inset-0 bg-wash pointer-events-none" />
        <FundoGrade />

        {!autenticado ? (
          /* ---------- Tela de login ---------- */
          <div className="relative z-10 min-h-screen grid place-items-center px-6 py-12">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="w-full max-w-sm"
            >
              <div className="text-center mb-8">
                <div className="inline-block text-left">
                  <LogoDigitando tamanho="text-5xl" />
                </div>
                <div className="font-mono text-sm text-mute mt-2">Painel de Admin.</div>
              </div>

              <motion.form
                key={tentativas}
                onSubmit={handleLogin}
                animate={tentativas ? { x: [0, -10, 9, -6, 4, 0] } : undefined}
                transition={{ duration: 0.4 }}
                className="rounded-2xl overflow-hidden bg-[#0a1212]/75 border border-white/[0.08] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
              >
                <div className="flex items-stretch h-10 border-b border-white/[0.08] bg-white/[0.02] font-mono text-xs">
                  <span className="relative flex items-center gap-2 px-3.5 text-ink bg-white/[0.03] border-r border-white/[0.08]">
                    <b className="w-2 h-2 rounded-sm bg-[#ffc773]" />
                    acesso.sh
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-teal" />
                  </span>
                  <span className="flex-1" />
                  <span className="flex items-center gap-1.5 px-4 text-[11px] text-dim">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    restrito
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  <label htmlFor="senha-admin" className="block font-mono text-xs text-mute">
                    <span className="text-teal mr-1.5">$</span>chave de acesso
                  </label>
                  <input
                    id="senha-admin"
                    type="password"
                    value={senhaInput}
                    onChange={(e) => {
                      setSenhaInput(e.target.value);
                      setErroSenha(false);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    autoFocus
                    className={`${campo} font-mono ${erroSenha ? 'border-[#f2665a]/70 focus:border-[#f2665a]/70 focus:ring-[#f2665a]/15' : ''}`}
                  />
                  <p
                    className={`font-mono text-xs text-[#ff9087] -mt-1 transition-opacity ${erroSenha ? 'opacity-100' : 'opacity-0'}`}
                    aria-live="polite"
                  >
                    → {msgErroLogin || 'chave incorreta, tenta de novo.'}
                  </p>
                  <button
                    type="submit"
                    disabled={!senhaInput || entrando}
                    className="w-full py-2.5 rounded-xl bg-teal text-[#03201a] font-mono text-sm font-medium shadow-[0_0_24px_rgba(13,187,149,0.3)] hover:bg-teal-light hover:shadow-[0_0_32px_rgba(70,227,190,0.45)] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
                  >
                    {entrando ? 'conferindo…' : 'entrar →'}
                  </button>
                </div>
              </motion.form>

              <div className="text-center mt-6">
                <a href="/" onClick={irParaSite} className="font-mono text-xs text-dim hover:text-mute transition">
                  ← voltar pro site
                </a>
              </div>
            </motion.div>
          </div>
        ) : (
          /* ---------- Painel ---------- */
          <div className="relative z-10">
            <nav className="max-w-6xl mx-auto px-6 pt-8 pb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-end gap-4">
                <LogoDigitando tamanho="text-4xl" />
                <span className="font-mono text-xs text-mute mb-1">
                  <span className="text-teal">//</span> painel do acervo
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <a
                  href="/"
                  onClick={irParaSite}
                  className="px-3.5 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-mute hover:text-ink hover:border-teal/40 transition"
                >
                  ver site ↗
                </a>
                <button
                  onClick={sair}
                  className="px-3.5 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-mute hover:text-[#ff9087] hover:border-[#f2665a]/40 transition"
                >
                  sair
                </button>
              </div>
            </nav>

            <AnimatePresence>
              {avisoAdmin && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  role="status"
                  className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 font-mono text-xs px-4 py-2.5 rounded-full border backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${
                    avisoAdmin.tipo === 'ok'
                      ? 'bg-teal/15 border-teal/40 text-teal-light'
                      : 'bg-[#f2665a]/15 border-[#f2665a]/40 text-[#ff9087]'
                  }`}
                >
                  {avisoAdmin.tipo === 'ok' ? '✓ ' : '→ '}
                  {avisoAdmin.txt}
                </motion.div>
              )}
            </AnimatePresence>

            <main className="max-w-6xl mx-auto px-6 pb-20 space-y-12">
              <div className="grid gap-8 lg:grid-cols-12 items-start">
                {/* Formulário */}
                <form
                  onSubmit={handleSalvarItem}
                  className="lg:col-span-8 rounded-[20px] bg-[#0c1616]/60 border border-white/[0.08] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-6 sm:p-8 space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <h2 className="font-mono text-sm font-normal text-mute">
                      <span className={editandoId !== null ? 'text-[#ffc773] mr-1.5' : 'text-teal mr-1.5'}>//</span>
                      {editandoId !== null ? 'editando_item' : 'novo_item'}
                    </h2>
                    {editandoId !== null && (
                      <button
                        type="button"
                        onClick={limparFormulario}
                        className="font-mono text-xs text-[#ffc773] hover:underline"
                      >
                        cancelar edição
                      </button>
                    )}
                  </div>

                  <div>
                    <label className={rotulo}>Título da obra *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={novoTitulo}
                        onChange={(e) => setNovoTitulo(e.target.value)}
                        placeholder="Ex: Resident Evil 4"
                        className={campo}
                      />
                      <button
                        type="button"
                        onClick={buscarCapaAutomatica}
                        disabled={buscandoCapa || !novoTitulo.trim()}
                        className="flex-none px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-teal-light font-mono text-xs hover:bg-teal/10 hover:border-teal/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {buscandoCapa ? 'buscando…' : 'buscar capa'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={rotulo}>Categoria</label>
                      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#05090a]/80 border border-white/10 font-mono text-xs">
                        {(['filme', 'jogo'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setNovoTipo(t);
                              // troca o status padrão junto, sem mexer em status personalizado
                              if (['', 'Assistido em Live', 'Zerado em Live'].includes(novoStatus)) {
                                setNovoStatus(t === 'jogo' ? 'Zerado em Live' : 'Assistido em Live');
                              }
                            }}
                            className={`py-1.5 rounded-lg transition ${
                              novoTipo === t ? 'bg-teal/15 text-teal-light' : 'text-mute hover:text-ink'
                            }`}
                          >
                            {t === 'filme' ? '🍿 filme' : '🎮 jogo'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={rotulo}>Nota (tier)</label>
                      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#05090a]/80 border border-white/10 font-mono text-xs">
                        {(['S', 'A', 'B', 'C'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNovoTier(t)}
                            className={`py-1.5 rounded-lg border transition ${
                              novoTier === t ? estiloTier[t].bg : 'border-transparent text-mute hover:text-ink'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={rotulo}>Status / tag</label>
                      <input
                        type="text"
                        value={novoStatus}
                        onChange={(e) => setNovoStatus(e.target.value)}
                        placeholder="Ex: Zerado em Live"
                        className={`${campo} font-mono text-xs`}
                      />
                    </div>
                    <div>
                      <label className={rotulo}>Data (mês ano)</label>
                      <input
                        type="text"
                        value={novaData}
                        onChange={(e) => setNovaData(e.target.value)}
                        placeholder="Ex: nov 2026"
                        className={`${campo} font-mono text-xs`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={rotulo}>Link do pôster vertical (URL)</label>
                    <input
                      type="url"
                      value={novaCapa}
                      onChange={(e) => setNovaCapa(e.target.value)}
                      placeholder="https://… (ou use “buscar capa”)"
                      className={`${campo} font-mono text-xs`}
                    />
                  </div>

                  <div>
                    <label className={rotulo}>Comentário rápido</label>
                    <textarea
                      rows={3}
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                      placeholder="O que achou da experiência em live?"
                      className={`${campo} resize-none`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={salvando || !apiOk}
                    className={`w-full py-3 rounded-xl font-mono text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      editandoId !== null
                        ? 'bg-[#f0a63a] text-[#2a1a02] hover:bg-[#ffc773] shadow-[0_0_24px_rgba(240,166,58,0.3)]'
                        : 'bg-teal text-[#03201a] hover:bg-teal-light shadow-[0_0_24px_rgba(13,187,149,0.3)]'
                    }`}
                  >
                    {salvando
                      ? 'salvando…'
                      : editandoId !== null
                        ? '✓ salvar alterações'
                        : '+ adicionar ao acervo'}
                  </button>
                </form>

                {/* Pré-visualização */}
                <aside className="lg:col-span-4 lg:sticky lg:top-8">
                  <div className="font-mono text-xs text-mute mb-3">
                    <span className="text-teal mr-1.5">//</span>prévia no site
                  </div>
                  <div className="max-w-[260px] mx-auto lg:max-w-none pointer-events-none">
                    <CartaoPoster item={previa} />
                  </div>
                </aside>
              </div>

              {/* Lista do acervo */}
              <section>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4 mb-6">
                  <h2 className="font-mono text-sm font-normal text-mute">
                    <span className="text-teal mr-1.5">//</span>acervo
                    <span className="ml-2 text-xs text-dim">({itens.length} itens)</span>
                  </h2>
                  {!carregando && apiOk && itens.length === 0 && (
                    <button
                      onClick={importarAcervoInicial}
                      disabled={salvando}
                      className="font-mono text-xs px-3.5 py-1.5 rounded-full bg-teal/10 border border-teal/30 text-teal-light hover:bg-teal/20 transition disabled:opacity-40"
                    >
                      importar acervo inicial
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {porRecencia.map((item) => {
                    const estaEditando = editandoId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-2xl border backdrop-blur-xl transition ${
                          estaEditando
                            ? 'bg-[#f0a63a]/10 border-[#f0a63a]/50'
                            : 'bg-[#0c1616]/60 border-white/[0.08] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.capa}
                            alt=""
                            className="w-10 h-[60px] object-cover rounded-lg bg-white/5 flex-none"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-ink truncate">{item.titulo}</div>
                            <div className="font-mono text-[10px] text-dim mt-0.5 flex items-center gap-1.5">
                              <span>{item.tipo === 'jogo' ? '🎮 jogo' : '🍿 filme'}</span>
                              <span>·</span>
                              <span className={estiloTier[item.tier].bg.split(' ').find((c) => c.startsWith('text-'))}>
                                tier {item.tier}
                              </span>
                              <span>·</span>
                              <span>{item.data}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-none font-mono text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleIniciarEdicao(item)}
                            className="text-teal-light hover:bg-teal/15 px-2.5 py-1.5 rounded-lg transition"
                          >
                            editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoverItem(item)}
                            className="text-[#ff9087] hover:bg-[#f2665a]/15 px-2.5 py-1.5 rounded-lg transition"
                          >
                            excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <p className="font-mono text-[11px] text-dim">
                <span className="text-teal/60 mr-1.5">#</span>
                {apiOk
                  ? 'as alterações vão direto pro banco e aparecem no site em até ~15s'
                  : 'API indisponível: rodando sem servidor (use vercel dev); nada será salvo'}
              </p>
            </main>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg text-ink font-sans selection:bg-teal selection:text-bg">
      {/* Background do Overlay */}
      <div className="fixed inset-0 bg-wash pointer-events-none" />
      <FundoGrade />

      {/* Topo / Brand */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <LogoDigitando />
            <div className="font-mono text-sm text-mute mt-1.5 tracking-tight">
              entretenimento ao vivo
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden md:flex items-center gap-3 font-mono text-xs text-mute">
            <span className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_8px_#0dbb95]" />
            <span>{horario.data}</span>
            <span className="w-1 h-1 rounded-full bg-dim" />
            <b className="text-ink font-normal tabular-nums">{horario.hora}</b>
          </div>

          <BotaoAoVivo />
        </div>
      </nav>

      {/* Hero + Bloco de Código */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full border border-teal/30 bg-teal/10 font-mono text-xs text-[#d3ebe5] mb-6">
            <span className="w-5 h-5 rounded-full bg-teal grid place-items-center shadow-[0_0_14px_rgba(13,187,149,0.6)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#03201a] animate-pulse" />
            </span>
            Hub oficial da comunidade do PVZRA!
          </div>

          <h1 className="leading-none">
            <span className="block font-extralight text-4xl sm:text-5xl tracking-[-0.035em] text-ink/90 mb-1">
              O arquivo das
            </span>
            <span className="block font-extrabold text-6xl sm:text-7xl tracking-[-0.055em] text-ink">
              nossas lives.
            </span>
          </h1>

          <div className="relative w-24 h-[3px] mt-3 ml-1 rounded bg-teal/25 overflow-hidden">
            <i className="absolute inset-0 bg-teal shadow-[0_0_10px_#0dbb95] trace-bar" />
          </div>

          <p className="mt-6 text-mute font-light text-base sm:text-lg max-w-xl leading-relaxed">
            Histórico com todos os jogos que zeramos<br />e os filmes que assistimos durante as lives.
          </p>
        </div>

        {/* Mini Editor de Código */}
        <div className="lg:col-span-5 rounded-2xl overflow-hidden bg-[#0a1212]/70 border border-white/[0.08] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] font-mono text-xs sm:text-sm">
          <div className="flex items-stretch h-10 border-b border-white/[0.08] bg-white/[0.02]">
            <button
              onClick={() => setAbaCodigo('acervo.py')}
              className={`flex items-center gap-2 px-3.5 text-xs border-r border-white/[0.08] relative transition ${
                abaCodigo === 'acervo.py' ? 'text-ink bg-white/[0.03]' : 'text-dim hover:text-mute'
              }`}
            >
              <b className="w-2 h-2 rounded-sm bg-[#ffc773]" />
              acervo.py
              {abaCodigo === 'acervo.py' && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-teal" />
              )}
            </button>
            <button
              onClick={() => setAbaCodigo('chat.sql')}
              className={`flex items-center gap-2 px-3.5 text-xs border-r border-white/[0.08] relative transition ${
                abaCodigo === 'chat.sql' ? 'text-ink bg-white/[0.03]' : 'text-dim hover:text-mute'
              }`}
            >
              <b className="w-2 h-2 rounded-sm bg-teal-light" />
              chat.sql
              {abaCodigo === 'chat.sql' && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-teal" />
              )}
            </button>
            <div className="flex-1" />
            <span className="flex items-center px-4 text-[11px] text-dim">
              {abaCodigo === 'acervo.py' ? 'Python' : 'SQL'}
            </span>
          </div>

          <EditorCodigo
            key={abaCodigo}
            linhas={
              abaCodigo === 'acervo.py'
                ? [
                    [['f', 'acervo'], ['p', ' = '], ['k', 'Central-Z'], ['p', '(']],
                    [['p', '  canal='], ['s', '"@pvzra"'], ['p', ',']],
                    [['p', '  jogos_zerados='], ['n', String(totalJogos)], ['p', ',']],
                    [['p', '  filmes_vistos='], ['n', String(totalFilmes)], ['p', ',']],
                    [['p', ')']],
                    [['f', 'acervo'], ['p', '.'], ['n', 'render'], ['p', '()'], ['c', ' # formato poster 2:3']],
                  ]
                : [
                    [['k', 'INSERT INTO'], ['p', ' sugestoes_live']],
                    [['k', 'VALUES'], ['p', ' ('], ['s', "'filme_ou_react'"], ['p', ', '], ['k', 'TRUE'], ['p', ');']],
                    [],
                    [['c', '-- quer indicar algo pra próxima live?']],
                    [['c', '-- manda em "sugerir()" abaixo!']],
                  ]
            }
          />
        </div>
      </header>

      {/* Catálogo: atividade recente, depois jogos e filmes */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20 space-y-16">
        <SecaoAcervo
          titulo="atividade recente"
          itens={atividadeRecente}
          carregando={carregando}
          vazio="Nenhuma atividade registrada ainda."
          extra={
            <div className="flex gap-2 font-mono text-xs">
              <a
                href="#jogos"
                className="px-3.5 py-1.5 rounded-full border bg-[#0c1616]/60 border-white/[0.08] text-mute hover:text-ink hover:border-teal/40 transition-all"
              >
                jogos_zerados
              </a>
              <a
                href="#filmes"
                className="px-3.5 py-1.5 rounded-full border bg-[#0c1616]/60 border-white/[0.08] text-mute hover:text-ink hover:border-teal/40 transition-all"
              >
                cine_z
              </a>
              <a
                href="#sugerir"
                className="px-3.5 py-1.5 rounded-full border bg-teal/10 border-teal/30 text-teal-light hover:bg-teal/20 transition-all"
              >
                sugerir()
              </a>
            </div>
          }
        />
        <SecaoAcervo
          id="jogos"
          titulo="jogos_zerados"
          itens={jogos}
          carregando={carregando}
          vazio="Nenhum jogo zerado em live ainda."
        />
        <SecaoAcervo
          id="filmes"
          titulo="cine_z"
          itens={filmes}
          carregando={carregando}
          vazio="Nenhum filme assistido em live ainda."
        />
        <SecaoSugestoes />
      </main>

      {/* Rodapé */}
      <footer className="relative z-10 max-w-6xl mx-auto px-6 py-8 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-mute">
        <div>
          <span className="text-teal">//</span> central z · comunidade oficial do PVZRA
        </div>
        <div className="flex items-center gap-2.5">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 stroke-teal-light fill-none stroke-[1.8] text-teal-light"
          >
            <rect x="2" y="5" width="20" height="14" rx="4" />
            <path d="M10 9.2l5 2.8-5 2.8z" fill="currentColor" />
          </svg>
          <span>
            Canal de cortes:{' '}
            <b className="text-ink font-normal">@cortespvzra</b>
          </span>
        </div>
      </footer>
    </div>
  );
}
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

function LogoDigitando() {
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
      className="font-bold text-6xl tracking-[-0.03em] leading-none"
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

const prefereMenosMovimento = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

function EditorCodigo({ linhas }: { linhas: Token[][] }) {
  // cada caractere é um passo; cada quebra de linha também
  const total = linhas.reduce(
    (soma, l, i) =>
      soma + l.reduce((a, [, t]) => a + t.length, 0) + (i < linhas.length - 1 ? 1 : 0),
    0
  );
  const [passo, setPasso] = useState(0);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (prefereMenosMovimento()) {
      setPronto(true);
      return;
    }
    const primeira = !editorJaDigitou;
    editorJaDigitou = true;
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
    timer = window.setTimeout(avanca, primeira ? 1400 : 120);
    return () => clearTimeout(timer);
    // a aba é trocada via `key`, então basta rodar na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="p-4 leading-relaxed select-none" aria-label="código ilustrativo">
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
            <div key={li} className="whitespace-pre min-h-[1.25em]">
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
}: {
  id?: string;
  titulo: string;
  itens: ItemAcervo[];
  vazio: string;
  extra?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4 mb-8">
        <h2 className="font-mono text-sm font-normal text-mute">
          <span className="text-teal mr-1.5">//</span>
          {titulo}
          <span className="ml-2 text-xs text-dim">
            ({itens.length} {itens.length === 1 ? 'item' : 'itens'})
          </span>
        </h2>
        {extra}
      </div>

      {itens.length === 0 ? (
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
  const [itens, setItens] = useState<ItemAcervo[]>(() => {
    try {
      const salvo = localStorage.getItem('pvzra_acervo_v2');
      return salvo ? JSON.parse(salvo) : acervoInicial;
    } catch {
      return acervoInicial;
    }
  });

  const [abaCodigo, setAbaCodigo] = useState<'acervo.py' | 'chat.sql'>('acervo.py');
  const [horario, setHorario] = useState({ data: '', hora: '' });

  // Estados do Painel Admin
  const [painelAberto, setPainelAberto] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [erroSenha, setErroSenha] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const painelRef = useRef<HTMLElement | null>(null);

  // Estados do Formulário
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoTipo, setNovoTipo] = useState<'jogo' | 'filme'>('filme');
  const [novoTier, setNovoTier] = useState<'S' | 'A' | 'B' | 'C'>('S');
  const [novoStatus, setNovoStatus] = useState('Assistido em Live');
  const [novaData, setNovaData] = useState('nov 2026');
  const [novaCapa, setNovaCapa] = useState('');
  const [novoComentario, setNovoComentario] = useState('');

  // Estado da Busca na API
  const [buscandoCapa, setBuscandoCapa] = useState(false);

  useEffect(() => {
    if (!painelAberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPainelAberto(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [painelAberto]);

  useEffect(() => {
    localStorage.setItem('pvzra_acervo_v2', JSON.stringify(itens));
  }, [itens]);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (senhaInput === 'pvzra') {
      setAutenticado(true);
      setErroSenha(false);
      setSenhaInput('');
    } else {
      setErroSenha(true);
    }
  };

  const limparFormulario = () => {
    setEditandoId(null);
    setNovoTitulo('');
    setNovoTipo('filme');
    setNovoTier('S');
    setNovoStatus('Assistido em Live');
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
    painelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleSalvarItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;

    const capaFinal =
      novaCapa.trim() ||
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&h=900&q=80';

    if (editandoId !== null) {
      setItens(
        itens.map((item) =>
          item.id === editandoId
            ? {
                ...item,
                titulo: novoTitulo,
                tipo: novoTipo,
                tier: novoTier,
                status: novoStatus || (novoTipo === 'jogo' ? 'Zerado em Live' : 'Assistido em Live'),
                data: novaData || 'nov 2026',
                comentario: novoComentario || 'Sem comentários adicionais.',
                capa: capaFinal,
              }
            : item
        )
      );
    } else {
      const novoItem: ItemAcervo = {
        id: Date.now(),
        titulo: novoTitulo,
        tipo: novoTipo,
        tier: novoTier,
        status: novoStatus || (novoTipo === 'jogo' ? 'Zerado em Live' : 'Assistido em Live'),
        data: novaData || 'nov 2026',
        comentario: novoComentario || 'Sem comentários adicionais.',
        capa: capaFinal,
      };
      setItens([novoItem, ...itens]);
    }

    limparFormulario();
  };

  const handleRemoverItem = (id: number) => {
    if (editandoId === id) limparFormulario();
    setItens(itens.filter((item) => item.id !== id));
  };

  const porRecencia = [...itens].sort(
    (a, b) => valorData(b.data) - valorData(a.data) || b.id - a.id
  );
  const atividadeRecente = porRecencia.slice(0, 4);
  const jogos = porRecencia.filter((i) => i.tipo === 'jogo');
  const filmes = porRecencia.filter((i) => i.tipo === 'filme');

  const totalJogos = itens.filter((i) => i.tipo === 'jogo').length;
  const totalFilmes = itens.filter((i) => i.tipo === 'filme').length;

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

          <button
            onClick={() => setPainelAberto(true)}
            className="font-mono text-xs px-3.5 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-mute hover:text-ink hover:border-teal/40 transition"
          >
            <span className="text-teal mr-1">//</span>admin
          </button>

          <a
            href="https://twitch.tv/pvzra"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs font-medium px-4 py-2 rounded-full bg-teal/10 border border-teal/30 text-teal-light hover:bg-teal hover:text-[#03201a] transition-all"
          >
            ● ao vivo
          </a>
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
                    [['f', 'acervo'], ['p', ' = '], ['k', 'CentralZ'], ['p', '(']],
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
                    [['c', '-- manda lá no chat ou no Discord!']],
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
            </div>
          }
        />
        <SecaoAcervo
          id="jogos"
          titulo="jogos_zerados"
          itens={jogos}
          vazio="Nenhum jogo zerado em live ainda."
        />
        <SecaoAcervo
          id="filmes"
          titulo="cine_z"
          itens={filmes}
          vazio="Nenhum filme assistido em live ainda."
        />
      </main>

      {/* Gaveta Lateral do Painel Admin */}
      <AnimatePresence>
        {painelAberto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPainelAberto(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />

            <motion.aside
              ref={painelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#081010] border-l border-white/[0.08] p-6 overflow-y-auto shadow-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                  <div className="font-mono text-sm text-ink flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal shadow-[0_0_8px_#0dbb95]" />
                    <span>painel_admin.sh</span>
                  </div>
                  <button
                    onClick={() => setPainelAberto(false)}
                    className="font-mono text-xs text-mute hover:text-ink px-2 py-1 rounded bg-white/[0.04]"
                  >
                    [ESC]
                  </button>
                </div>

                {!autenticado ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <p className="font-mono text-xs text-mute leading-relaxed">
                      <span className="text-teal">$</span> Digite a chave de
                      acesso para liberar o gerenciamento do catálogo (senha
                      padrão: <b className="text-teal-light">pvzra</b>):
                    </p>
                    <div>
                      <input
                        type="password"
                        value={senhaInput}
                        onChange={(e) => setSenhaInput(e.target.value)}
                        placeholder="Senha do admin..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-white/10 font-mono text-sm text-ink focus:outline-none focus:border-teal"
                        autoFocus
                      />
                      {erroSenha && (
                        <p className="font-mono text-xs text-[#ff9087] mt-2">
                          → erro: senha incorreta.
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-teal text-[#03201a] font-mono text-xs font-bold uppercase tracking-wider hover:bg-teal-light transition"
                    >
                      Autenticar
                    </button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <form onSubmit={handleSalvarItem} className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-teal-light uppercase tracking-wider">
                          {editandoId !== null
                            ? '// Editando Item'
                            : '// Adicionar Pôster'}
                        </span>
                        {editandoId !== null && (
                          <button
                            type="button"
                            onClick={limparFormulario}
                            className="font-mono text-[11px] text-[#ffc773] hover:underline"
                          >
                            cancelar edição
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block font-mono text-[11px] text-mute mb-1">
                          Título da Obra *
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={novoTitulo}
                            onChange={(e) => setNovoTitulo(e.target.value)}
                            placeholder="Ex: Resident Evil 4"
                            className="flex-1 px-3 py-2 rounded-lg bg-bg border border-white/10 text-sm text-ink focus:outline-none focus:border-teal"
                          />
                          <button
                            type="button"
                            onClick={buscarCapaAutomatica}
                            disabled={buscandoCapa || !novoTitulo.trim()}
                            className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-teal-light font-mono text-xs hover:bg-teal/10 hover:border-teal/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {buscandoCapa ? 'Buscando...' : '🔍 Buscar'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-mono text-[11px] text-mute mb-1">
                            Categoria
                          </label>
                          <select
                            value={novoTipo}
                            onChange={(e) =>
                              setNovoTipo(e.target.value as 'jogo' | 'filme')
                            }
                            className="w-full px-3 py-2 rounded-lg bg-bg border border-white/10 font-mono text-xs text-ink focus:outline-none focus:border-teal"
                          >
                            <option value="filme">🍿 Filme</option>
                            <option value="jogo">🎮 Jogo</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-mono text-[11px] text-mute mb-1">
                            Nota (Tier)
                          </label>
                          <select
                            value={novoTier}
                            onChange={(e) =>
                              setNovoTier(
                                e.target.value as 'S' | 'A' | 'B' | 'C'
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg bg-bg border border-white/10 font-mono text-xs text-ink focus:outline-none focus:border-teal"
                          >
                            <option value="S">Tier S (Verde)</option>
                            <option value="A">Tier A (Âmbar)</option>
                            <option value="B">Tier B (Azul)</option>
                            <option value="C">Tier C (Coral)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-mono text-[11px] text-mute mb-1">
                            Status / Tag
                          </label>
                          <input
                            type="text"
                            value={novoStatus}
                            onChange={(e) => setNovoStatus(e.target.value)}
                            placeholder="Ex: Zerado em Live"
                            className="w-full px-3 py-2 rounded-lg bg-bg border border-white/10 font-mono text-xs text-ink focus:outline-none focus:border-teal"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[11px] text-mute mb-1">
                            Data (Mês/Ano)
                          </label>
                          <input
                            type="text"
                            value={novaData}
                            onChange={(e) => setNovaData(e.target.value)}
                            placeholder="Ex: nov 2026"
                            className="w-full px-3 py-2 rounded-lg bg-bg border border-white/10 font-mono text-xs text-ink focus:outline-none focus:border-teal"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-mono text-[11px] text-mute mb-1">
                          Link do Pôster Vertical (URL)
                        </label>
                        <input
                          type="url"
                          value={novaCapa}
                          onChange={(e) => setNovaCapa(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 rounded-lg bg-bg border border-white/10 font-mono text-xs text-ink focus:outline-none focus:border-teal"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[11px] text-mute mb-1">
                          Comentário Rápido
                        </label>
                        <textarea
                          rows={2}
                          value={novoComentario}
                          onChange={(e) => setNovoComentario(e.target.value)}
                          placeholder="O que achou da experiência em live?"
                          className="w-full px-3 py-2 rounded-lg bg-bg border border-white/10 text-sm text-ink focus:outline-none focus:border-teal resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition ${
                            editandoId !== null
                              ? 'bg-[#f0a63a] text-[#2a1a02] hover:bg-[#ffc773] shadow-[0_0_20px_rgba(240,166,58,0.3)]'
                              : 'bg-teal text-[#03201a] hover:bg-teal-light shadow-[0_0_20px_rgba(13,187,149,0.3)]'
                          }`}
                        >
                          {editandoId !== null
                            ? '✓ Salvar Alterações'
                            : '+ Salvar no Catálogo'}
                        </button>
                      </div>
                    </form>

                    {/* Lista de Itens Cadastrados */}
                    <div className="border-t border-white/[0.08] pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs text-mute">
                          // Itens Cadastrados ({itens.length})
                        </span>
                        <button
                          onClick={() => {
                            limparFormulario();
                            setItens(acervoInicial);
                          }}
                          className="font-mono text-[10px] text-dim hover:text-teal-light underline"
                        >
                          resetar padrão
                        </button>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {itens.map((item) => {
                          const estaEditando = editandoId === item.id;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between gap-2.5 p-2 rounded-xl border transition ${
                                estaEditando
                                  ? 'bg-teal/10 border-teal/50'
                                  : 'bg-bg border-white/[0.06]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={item.capa}
                                  alt={item.titulo}
                                  className="w-8 h-11 object-cover rounded bg-white/5 flex-none"
                                />
                                <div className="truncate">
                                  <div className="text-xs font-semibold text-ink truncate">
                                    {item.titulo}
                                  </div>
                                  <div className="font-mono text-[10px] text-dim">
                                    {item.tipo.toUpperCase()} · TIER {item.tier}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-none">
                                <button
                                  type="button"
                                  onClick={() => handleIniciarEdicao(item)}
                                  className="font-mono text-[11px] text-teal-light hover:bg-teal/15 px-2 py-1 rounded border border-transparent hover:border-teal/30 transition"
                                >
                                  editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoverItem(item.id)}
                                  className="font-mono text-[11px] text-[#ff9087] hover:bg-[#f2665a]/15 px-2 py-1 rounded border border-transparent hover:border-[#f2665a]/30 transition"
                                >
                                  excluir
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.08] pt-4 mt-6 flex items-center justify-between font-mono text-[11px] text-dim">
                <span>storage: local_browser</span>
                {autenticado && (
                  <button
                    onClick={() => {
                      limparFormulario();
                      setAutenticado(false);
                    }}
                    className="text-mute hover:text-ink underline"
                  >
                    trancar painel
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
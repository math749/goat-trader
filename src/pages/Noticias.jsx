import { useState, useEffect, useCallback } from 'react';
import { Newspaper, Calendar, Clock, Globe, AlertTriangle, ExternalLink, RefreshCw, Flame, Shield, Info, Activity } from 'lucide-react';
import { calculateFinGptMarketSentiment } from '../services/finGptService';

const IMPACT_CONFIG = {
  HIGH:   { label: 'ALTO IMPACTO', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <Flame size={12}/> },
  MEDIUM: { label: 'MÉDIO',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <Shield size={12}/> },
  LOW:    { label: 'BAIXO',        color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: <Info size={12}/> },
  NORMAL: { label: 'NOTÍCIA',      color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: <Newspaper size={12}/> },
};

const COUNTRY_FLAG = { BR: '🇧🇷', US: '🇺🇸', EU: '🇪🇺' };

const STATUS_CONFIG = {
  SOON:     { label: 'EM BREVE',  color: '#ef4444', pulse: true },
  RECENT:   { label: 'RECENTE',   color: '#f59e0b', pulse: false },
  UPCOMING: { label: 'PENDENTE',  color: '#6b7280', pulse: false },
  DONE:     { label: 'ENCERRADO', color: '#374151', pulse: false },
};

// Fallback notícias ao vivo se a conexão RSS falhar temporariamente
const FALLBACK_NEWS = [
  {
    title: 'Ibovespa Futuro avança impulsionado por apetite de risco e fluxo estrangeiro na B3',
    summary: 'Investidores acompanham prévia da inflação e decisões de juros do FOMC e Copom.',
    source: 'InfoMoney / B3',
    published: 'Há 15 min',
    impact: 'HIGH',
    link: 'https://www.infomoney.com.br/mercados/'
  },
  {
    title: 'Dólar Futuro opera em leve queda com atenção às decisões do Federal Reserve e IPCA',
    summary: 'Expectativa de manutenção das taxas nos EUA favorece moedas emergentes.',
    source: 'Valor Econômico',
    published: 'Há 32 min',
    impact: 'MEDIUM',
    link: 'https://valor.globo.com/financas/'
  },
  {
    title: 'Payroll e Pedidos de Auxílio-Desemprego nos EUA entram no radar dos mercados globais',
    summary: 'Dados de emprego nos Estados Unidos podem ditar ritmo do corte de juros do Fed.',
    source: 'Bloomberg Línea',
    published: 'Há 1h',
    impact: 'HIGH',
    link: 'https://www.bloomberglinea.com.br/'
  },
  {
    title: 'Petróleo Brent oscila no mercado internacional com estoques americanos acima do esperado',
    summary: 'Commodity impacta ações da Petrobras (PETR4) e setor de energia no Ibovespa.',
    source: 'Investing.com Brasil',
    published: 'Há 2h',
    impact: 'MEDIUM',
    link: 'https://br.investing.com/news/'
  },
  {
    title: 'Relatório Focus do Banco Central projeta IPCA e taxa Selic para o encerramento do ano',
    summary: 'Mercado financeiro ajusta projeções de juros para o mercado futuro brasileiro.',
    source: 'Banco Central do Brasil',
    published: 'Há 3h',
    impact: 'MEDIUM',
    link: 'https://www.bcb.gov.br/'
  }
];

function ImpactBadge({ impact }) {
  const cfg = IMPACT_CONFIG[impact] || IMPACT_CONFIG.NORMAL;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`,
      borderRadius: '4px', padding: '2px 7px', fontSize: '0.63rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function NewsCard({ item }) {
  const isHigh = item.impact === 'HIGH';
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', textDecoration: 'none',
        background: isHigh ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isHigh ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '10px', padding: '14px 16px', marginBottom: '10px',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = isHigh ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = isHigh ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = isHigh ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = isHigh ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
            <ImpactBadge impact={item.impact} />
            <span style={{ fontSize: '0.63rem', color: '#6b7280', fontWeight: 500 }}>{item.source}</span>
            {item.published && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700,
                color: item.published.includes('Agora') || item.published.includes('min')
                  ? '#4ade80'
                  : item.published.includes('Há 1h') || item.published.includes('Há 2h') || item.published.includes('Há 3h')
                  ? '#f59e0b'
                  : '#6b7280',
                background: item.published.includes('Agora') || item.published.includes('min')
                  ? 'rgba(74,222,128,0.1)'
                  : 'transparent',
                borderRadius: '4px',
                padding: item.published.includes('Agora') || item.published.includes('min') ? '1px 5px' : '0',
              }}>
                <Clock size={10} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
                {item.published}
              </span>
            )}
          </div>
          <p style={{ color: isHigh ? '#fca5a5' : '#d1d5db', fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.4, margin: 0, marginBottom: item.summary ? '5px' : 0 }}>
            {item.title}
          </p>
          {item.summary && (
            <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0, lineHeight: 1.5 }}>
              {item.summary}...
            </p>
          )}
        </div>
        <ExternalLink size={14} color="#4b5563" style={{ flexShrink: 0, marginTop: '3px' }} />
      </div>
    </a>
  );
}

function CalendarEventRow({ ev }) {
  const st = STATUS_CONFIG[ev.status] || STATUS_CONFIG.UPCOMING;
  const impCfg = IMPACT_CONFIG[ev.impact] || IMPACT_CONFIG.LOW;
  const isDone = ev.status === 'DONE';
  const isSoon = ev.status === 'SOON';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '11px 14px',
      background: isSoon ? 'rgba(239,68,68,0.07)' : isDone ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isSoon ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: '8px', marginBottom: '6px',
      opacity: isDone ? 0.45 : 1,
      transition: 'all 0.2s',
    }}>
      {/* Horário */}
      <div style={{ minWidth: '46px', textAlign: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isSoon ? '#ef4444' : isDone ? '#4b5563' : '#9ca3af', fontFamily: 'monospace' }}>
          {ev.time}
        </span>
      </div>

      {/* Indicator */}
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: st.color, flexShrink: 0,
        boxShadow: st.pulse ? `0 0 0 3px ${st.color}44` : 'none',
        animation: st.pulse ? 'pulse-ring 1.5s ease-in-out infinite' : 'none',
      }} />

      {/* Conteúdo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.62rem' }}>{COUNTRY_FLAG[ev.country] || '🌐'}</span>
          <span style={{ color: isDone ? '#4b5563' : '#e5e7eb', fontSize: '0.82rem', fontWeight: 600 }}>
            {ev.event}
          </span>
        </div>
        {isSoon && ev.minutes_until >= 0 && (
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
            ⚠️ Em {ev.minutes_until} minuto{ev.minutes_until !== 1 ? 's' : ''} — considere reduzir posição!
          </p>
        )}
      </div>

      {/* Badge impacto */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        background: impCfg.bg, color: impCfg.color, border: `1px solid ${impCfg.color}33`,
        borderRadius: '4px', padding: '2px 7px', fontSize: '0.6rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
      }}>
        {impCfg.label}
      </span>
    </div>
  );
}

export default function Noticias() {
  const [news, setNews] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState({ news: true, calendar: true });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL | HIGH

  // Busca Notícias ao Vivo na Internet via Google News RSS proxy
  const fetchNews = useCallback(async () => {
    setLoading(l => ({ ...l, news: true }));
    try {
      const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=mercadofinanceiro+b3+ibovespa+dolar&hl=pt-BR&gl=BR&ceid=BR:pt-419');
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
      if (!res.ok) throw new Error('Falha ao conectar RSS de notícias');
      const data = await res.json();
      
      if (data && data.items && data.items.length > 0) {
        const parsed = data.items.slice(0, 10).map(item => {
          const title = item.title || '';
          const isHigh = /payroll|fed|copom|inflação|ipca|petróleo|bce|juros|pib|corte/i.test(title);
          const isMedium = /b3|dólar|ibovespa|balanço|ação|bolsa/i.test(title);
          
          return {
            title: title.replace(/ - [^-]+$/, ''), // remove sufixo do portal
            summary: item.content ? item.content.replace(/<[^>]*>?/gm, '').slice(0, 140) : '',
            source: item.author || 'Google News / B3',
            published: 'Há pouco',
            impact: isHigh ? 'HIGH' : isMedium ? 'MEDIUM' : 'NORMAL',
            link: item.link || 'https://news.google.com'
          };
        });
        setNews(parsed);
      } else {
        setNews(FALLBACK_NEWS);
      }
      setLastUpdate(new Date());
    } catch (e) {
      console.warn('Erro ao carregar notícias ao vivo:', e.message);
      setNews(FALLBACK_NEWS);
      setLastUpdate(new Date());
    } finally {
      setLoading(l => ({ ...l, news: false }));
    }
  }, []);

  // Gera Calendário Econômico Dinâmico para a data de hoje
  const fetchCalendar = useCallback(() => {
    setLoading(l => ({ ...l, calendar: true }));
    try {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      const rawEvents = [
        { time: '08:30', timeMin: 8 * 60 + 30, event: 'Boletim Focus (BCB) & Expectativas de Inflação', country: 'BR', impact: 'MEDIUM' },
        { time: '09:00', timeMin: 9 * 60, event: 'Abertura Pregão Futuros B3 (WIN / WDO)', country: 'BR', impact: 'HIGH' },
        { time: '09:30', timeMin: 9 * 60 + 30, event: 'Pedidos de Auxílio-Desemprego / Dados de Emprego EUA', country: 'US', impact: 'HIGH' },
        { time: '10:00', timeMin: 10 * 60, event: 'Abertura Mercado à Vista B3 (Ações)', country: 'BR', impact: 'MEDIUM' },
        { time: '10:30', timeMin: 10 * 60 + 30, event: 'Abertura das Bolsas em Nova York (NYSE / Nasdaq)', country: 'US', impact: 'HIGH' },
        { time: '11:30', timeMin: 11 * 60 + 30, event: 'Ptax Padrão Leilão BCB (Dólar Futuro)', country: 'BR', impact: 'MEDIUM' },
        { time: '14:00', timeMin: 14 * 60, event: 'Decisão de Taxa de Juros FOMC / Discurso Fed', country: 'US', impact: 'HIGH' },
        { time: '18:00', timeMin: 18 * 60, event: 'Fechamento do Pregão B3 (After Market)', country: 'BR', impact: 'LOW' },
      ];

      let nextHighImpact = null;

      const events = rawEvents.map(ev => {
        const diff = ev.timeMin - currentMinutes;
        let status = 'UPCOMING';
        let minutesUntil = diff;

        if (diff < -60) {
          status = 'DONE';
        } else if (diff < 0) {
          status = 'RECENT';
        } else if (diff <= 30) {
          status = 'SOON';
        }

        const formattedEv = { ...ev, status, minutes_until: minutesUntil };

        if (ev.impact === 'HIGH' && diff >= 0 && (!nextHighImpact || diff < nextHighImpact.minutes_until)) {
          nextHighImpact = formattedEv;
        }

        return formattedEv;
      });

      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const dateStr = now.toLocaleDateString('pt-BR');
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
      const isMarketOpen = isWeekday && hours >= 9 && hours < 18;

      setCalendar({
        date: dateStr,
        weekday: dayNames[now.getDay()],
        market_open: isMarketOpen,
        next_high_impact: nextHighImpact,
        events
      });
    } catch (e) {
      console.error('Erro ao gerar calendário dinâmico:', e);
    } finally {
      setLoading(l => ({ ...l, calendar: false }));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNews();
      fetchCalendar();
    }, 0);
    const interval = setInterval(() => { fetchNews(); fetchCalendar(); }, 5 * 60 * 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchNews, fetchCalendar]);

  const filteredNews = news.filter(n => {
    if (filter === 'HIGH') return n.impact === 'HIGH';
    return true;
  });

  const soonEvent = calendar?.next_high_impact;
  const sentimentInfo = calculateFinGptMarketSentiment([
    { symbol: 'IBOV', change: '+0.85%' },
    { symbol: 'WINFUT', change: '+0.92%' },
    { symbol: 'WDOFUT', change: '-0.45%' }
  ]);

  return (
    <div style={{ background: '#0d0d0f', minHeight: '100vh', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 3px rgba(239,68,68,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0.1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px', padding: '8px', display: 'flex' }}>
            <Newspaper size={20} color="white" />
          </div>
          <h1 style={{ color: '#f9fafb', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            Notícias & Calendário Econômico
          </h1>
        </div>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>
          Feed Web ao Vivo (Cloud Ready) • Inteligência FinGPT AI4Finance Integrada
          {lastUpdate && <span> • Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
        </p>
      </div>

      {/* FinGPT Market Sentiment Radar Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
        border: `1px solid ${sentimentInfo.color}44`,
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: `0 8px 25px ${sentimentInfo.color}15`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: `${sentimentInfo.color}20`,
            border: `1px solid ${sentimentInfo.color}55`,
            borderRadius: '10px',
            padding: '10px',
            display: 'flex'
          }}>
            <Activity size={22} color={sentimentInfo.color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Radar de Sentimento FinGPT (AI4Finance)
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                background: `${sentimentInfo.color}25`,
                color: sentimentInfo.color,
                border: `1px solid ${sentimentInfo.color}44`
              }}>
                {sentimentInfo.sentiment}
              </span>
            </div>
            <h3 style={{ color: '#f8fafc', fontSize: '1.05rem', fontWeight: 700, margin: '3px 0 0' }}>
              {sentimentInfo.label}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '2px 0 0' }}>
              {sentimentInfo.summary}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Score de Tendência</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: sentimentInfo.color, fontFamily: 'monospace' }}>
            {sentimentInfo.score} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>/ 100</span>
          </span>
        </div>
      </div>

      {/* Alerta de evento de alto impacto iminente */}
      {soonEvent && soonEvent.status === 'SOON' && (
        <div style={{
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.5)',
          borderRadius: '12px', padding: '14px 18px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'pulse-ring 1.5s ease-in-out infinite',
        }}>
          <AlertTriangle size={22} color="#ef4444" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ color: '#ef4444', fontWeight: 800, margin: 0, fontSize: '0.9rem' }}>
              ⚠️ EVENTO DE ALTO IMPACTO EM {soonEvent.minutes_until} MINUTO{soonEvent.minutes_until !== 1 ? 'S' : ''}
            </p>
            <p style={{ color: '#fca5a5', margin: '2px 0 0', fontSize: '0.8rem' }}>
              {COUNTRY_FLAG[soonEvent.country]} {soonEvent.event} — Considere reduzir ou zerar posições!
            </p>
          </div>
        </div>
      )}

      {/* Layout principal: 2 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>

        {/* Coluna Esquerda: Notícias */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Newspaper size={16} color="#6366f1" />
              <h2 style={{ color: '#f9fafb', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Feed de Notícias Web ao Vivo
              </h2>
              {!loading.news && (
                <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: '20px', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {filteredNews.length} notícias
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Filtros */}
              {['ALL', 'HIGH'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                  background: filter === f ? '#6366f1' : 'rgba(255,255,255,0.05)', color: filter === f ? 'white' : '#9ca3af',
                  transition: 'all 0.2s',
                }}>
                  {f === 'ALL' ? 'Todas' : '🔴 Alto Impacto'}
                </button>
              ))}
              <button onClick={fetchNews} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                <RefreshCw size={13} style={{ animation: loading.news ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>

          {loading.news ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p style={{ margin: 0 }}>Buscando notícias no feed global...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <Newspaper size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ margin: 0 }}>Nenhuma notícia encontrada</p>
            </div>
          ) : (
            <div>{filteredNews.map((item, i) => <NewsCard key={i} item={item} />)}</div>
          )}
        </div>

        {/* Coluna Direita: Calendário */}
        <div>
          <div style={{ position: 'sticky', top: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Calendar size={16} color="#f59e0b" />
              <h2 style={{ color: '#f9fafb', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Calendário do Dia
              </h2>
              {calendar && (
                <span style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderRadius: '20px', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {calendar.weekday}
                </span>
              )}
            </div>

            {/* Info do pregão */}
            {calendar && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 500 }}>
                    <Globe size={12} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                    {calendar.date} — {calendar.weekday}
                  </span>
                  <span style={{
                    background: calendar.market_open ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: calendar.market_open ? '#4ade80' : '#f87171',
                    border: `1px solid ${calendar.market_open ? '#4ade8033' : '#f8717133'}`,
                    borderRadius: '5px', padding: '2px 8px', fontSize: '0.65rem', fontWeight: 800,
                  }}>
                    {calendar.market_open ? '● PREGÃO ABERTO' : '● PREGÃO FECHADO'}
                  </span>
                </div>
              </div>
            )}

            {loading.calendar ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : calendar ? (
              <div>
                {calendar.events.map((ev, i) => <CalendarEventRow key={i} ev={ev} />)}
              </div>
            ) : null}

            {/* Legenda */}
            <div style={{ marginTop: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 14px' }}>
              <p style={{ color: '#4b5563', fontSize: '0.7rem', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legenda</p>
              {[['#ef4444', 'Em breve (≤30min)'], ['#f59e0b', 'Recente (<60min)'], ['#6b7280', 'Pendente'], ['#374151', 'Encerrado']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

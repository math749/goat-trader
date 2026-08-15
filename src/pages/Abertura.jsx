import { useState, useEffect } from 'react';
import PreMarketCalculator from '../components/PreMarketCalculator';
import { 
  Calculator, 
  Clock, 
  CheckSquare, 
  Square, 
  Flame,
  Globe,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const Abertura = () => {
  const [macroData, setMacroData] = useState(null);
  const [fairValue, setFairValue] = useState(null);

  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem('premarket_checklist_today');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.warn('Erro ao carregar checklist:', e); }
    }
    return [
      { id: 1, text: 'Checar Notícias de Alto Impacto (Calendário Econômico / FED / Payroll / Copom)', done: false },
      { id: 2, text: 'Verificar Índice VIX & Futuros S&P 500 no Pré-Market', done: false },
      { id: 3, text: 'Marcar Mínima, Máxima e Vwap de Fechamento do Pregão Anterior (WIN & WDO)', done: false },
      { id: 4, text: 'Definir Limite de Loss Máximo do Dia & Tamanho de Mão Inicial', done: false },
      { id: 5, text: 'Conferir Sinal da Equação da Abertura e Estimativa de Gap', done: false }
    ];
  });

  useEffect(() => {
    localStorage.setItem('premarket_checklist_today', JSON.stringify(checklist));
  }, [checklist]);

  useEffect(() => {
    const fetchPreMarketData = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/pre-market');
        if (res.ok) {
          const data = await res.json();
          setMacroData(data.market_data);
          setFairValue(data.fair_value);
        }
      } catch (e) {
        console.warn('Erro ao buscar pré-market:', e);
      }
    };
    fetchPreMarketData();
    const interval = setInterval(fetchPreMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleCheck = (id) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const resetChecklist = () => {
    setChecklist(prev => prev.map(item => ({ ...item, done: false })));
  };

  const completedCount = checklist.filter(c => c.done).length;

  return (
    <div style={{ paddingBottom: '2.5rem' }}>
      {/* Header com Status do Pregão B3 */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2><Calculator size={28} color="var(--primary-accent)" /> Central de Abertura de Mercado & Pré-Market</h2>
              <span style={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                color: '#60a5fa', 
                fontSize: '0.75rem', 
                fontWeight: 'bold', 
                padding: '0.25rem 0.6rem', 
                borderRadius: '20px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                PRE-MARKET B3 & GLOBALS
              </span>
            </div>
            <p style={{ marginTop: '0.4rem', color: 'var(--text-muted)' }}>
              Calcule o viés direcional, fair value do leilão e cotações internacionais antes da abertura das 09:00.
            </p>
          </div>
        </div>

        {/* Linha do Tempo dos Horários Importantes da Abertura */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', 
          gap: '0.75rem', 
          marginTop: '1.25rem',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          padding: '1rem',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={18} color="#f59e0b" />
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>08:55 BRT</span>
              <strong style={{ fontSize: '0.85rem', color: 'white' }}>Leilão de Abertura B3</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Zap size={18} color="#10b981" />
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>09:00 BRT</span>
              <strong style={{ fontSize: '0.85rem', color: 'white' }}>Abertura Futuros (WIN/WDO)</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={18} color="#3b82f6" />
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>10:00 BRT</span>
              <strong style={{ fontSize: '0.85rem', color: 'white' }}>Abertura Ações À Vista B3</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Globe size={18} color="#a855f7" />
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>10:30 BRT</span>
              <strong style={{ fontSize: '0.85rem', color: 'white' }}>Abertura Bolsas EUA (NYSE)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ITEM 1: PAINEL MACRO GLOBAL AO VIVO (CARDS INTERNACIONAIS)  */}
      {/* ============================================================ */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem' }}>
          <Globe size={20} color="#38bdf8" /> Radar Macro Global Ao Vivo (Pré-Market)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
          {/* Card 1: S&P 500 */}
          <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '0.85rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>🇺🇸 S&P 500 FUT</span>
            <strong style={{ fontSize: '1.1rem', color: 'white', display: 'block', margin: '3px 0' }}>
              {macroData?.sp500?.last ? macroData.sp500.last : '5.450,0'}
            </strong>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              color: (macroData?.sp500?.change_pct || 0) >= 0 ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {(macroData?.sp500?.change_pct || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {macroData?.sp500?.change_pct ? `${macroData.sp500.change_pct}%` : '+0,40%'}
            </span>
          </div>

          {/* Card 2: NASDAQ 100 */}
          <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '0.85rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>🇺🇸 NASDAQ 100</span>
            <strong style={{ fontSize: '1.1rem', color: 'white', display: 'block', margin: '3px 0' }}>
              {macroData?.nasdaq?.last ? macroData.nasdaq.last : '19.800,0'}
            </strong>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              color: (macroData?.nasdaq?.change_pct || 0) >= 0 ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {(macroData?.nasdaq?.change_pct || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {macroData?.nasdaq?.change_pct ? `${macroData.nasdaq.change_pct}%` : '+0,60%'}
            </span>
          </div>

          {/* Card 3: EWZ BRASIL */}
          <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '0.85rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <span style={{ fontSize: '0.72rem', color: '#60a5fa', display: 'block', fontWeight: 'bold' }}>🇧🇷 EWZ (ETF BRASIL)</span>
            <strong style={{ fontSize: '1.1rem', color: 'white', display: 'block', margin: '3px 0' }}>
              {macroData?.ewz?.last ? `US$ ${macroData.ewz.last}` : 'US$ 28.50'}
            </strong>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              color: (macroData?.ewz?.change_pct || 0) >= 0 ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {(macroData?.ewz?.change_pct || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {macroData?.ewz?.change_pct ? `${macroData.ewz.change_pct}%` : '+0,80%'}
            </span>
          </div>

          {/* Card 4: DÓLAR BRL */}
          <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '0.85rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <span style={{ fontSize: '0.72rem', color: '#c084fc', display: 'block', fontWeight: 'bold' }}>💵 DÓLAR / REAL</span>
            <strong style={{ fontSize: '1.1rem', color: 'white', display: 'block', margin: '3px 0' }}>
              {macroData?.usd_brl?.last ? `R$ ${macroData.usd_brl.last}` : 'R$ 5,54'}
            </strong>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              color: (macroData?.usd_brl?.change_pct || 0) <= 0 ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {(macroData?.usd_brl?.change_pct || 0) <= 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
              {macroData?.usd_brl?.change_pct ? `${macroData.usd_brl.change_pct}%` : '-0,30%'}
            </span>
          </div>

          {/* Card 5: PETRÓLEO WTI */}
          <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '0.85rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>🛢️ PETRÓLEO WTI</span>
            <strong style={{ fontSize: '1.1rem', color: 'white', display: 'block', margin: '3px 0' }}>
              {macroData?.crude_oil?.last ? `US$ ${macroData.crude_oil.last}` : 'US$ 78.50'}
            </strong>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              color: (macroData?.crude_oil?.change_pct || 0) >= 0 ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {(macroData?.crude_oil?.change_pct || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {macroData?.crude_oil?.change_pct ? `${macroData.crude_oil.change_pct}%` : '+0,50%'}
            </span>
          </div>

          {/* Card 6: MINÉRIO DE FERRO */}
          <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '0.85rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>⛏️ MINÉRIO (FEF2!)</span>
            <strong style={{ fontSize: '1.1rem', color: 'white', display: 'block', margin: '3px 0' }}>
              {macroData?.iron_ore?.last ? `US$ ${macroData.iron_ore.last}` : 'US$ 105.20'}
            </strong>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              color: (macroData?.iron_ore?.change_pct || 0) >= 0 ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {(macroData?.iron_ore?.change_pct || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {macroData?.iron_ore?.change_pct ? `${macroData.iron_ore.change_pct}%` : '+0,80%'}
            </span>
          </div>

          {/* Card 7: VIX MEDO */}
          <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '0.85rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <span style={{ fontSize: '0.72rem', color: '#f59e0b', display: 'block', fontWeight: 'bold' }}>⚠️ VIX (MEDO EUA)</span>
            <strong style={{ fontSize: '1.1rem', color: 'white', display: 'block', margin: '3px 0' }}>
              {macroData?.vix?.last ? macroData.vix.last : '14.85'}
            </strong>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              color: (macroData?.vix?.change_pct || 0) <= 0 ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {(macroData?.vix?.change_pct || 0) <= 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
              {macroData?.vix?.change_pct ? `${macroData.vix.change_pct}%` : '-1,20%'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ITEM 2: CALCULADORA DE FAIR VALUE (PREÇO JUSTO DE ABERTURA) */}
      {/* ============================================================ */}
      <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: '1.25rem', marginBottom: '1.75rem', borderLeft: '4px solid #a855f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#c084fc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} /> Preço Justo de Abertura B3 (Fair Value & Projeção de Gap)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Calcula o Preço Justo Teórico de Abertura baseado no Fechamento Anterior + Matriz de Futuros Globais (EUA / Commodities / Dólar)
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          
          {/* Card Fair Value WIN */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <strong style={{ color: '#60a5fa', fontSize: '0.95rem' }}>MINI ÍNDICE (WIN)</strong>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 'bold', 
                padding: '0.2rem 0.55rem', 
                borderRadius: '4px',
                backgroundColor: (fairValue?.win?.diff_points || 0) > 0 ? 'rgba(16, 185, 129, 0.2)' : ((fairValue?.win?.diff_points || 0) < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'),
                color: (fairValue?.win?.diff_points || 0) > 0 ? '#10b981' : ((fairValue?.win?.diff_points || 0) < 0 ? '#ef4444' : '#60a5fa')
              }}>
                {fairValue?.win?.status || 'GAP DE ALTA ESPERADO (+)'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>AJUSTE ANTERIOR (MT5)</span>
                <strong style={{ color: 'white', fontSize: '1.1rem' }}>
                  {fairValue?.win?.prev_close ? Number(fairValue.win.prev_close).toLocaleString('pt-BR') : '177.645'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>PREÇO JUSTO TEÓRICO</span>
                <strong style={{ color: '#38bdf8', fontSize: '1.1rem' }}>
                  {fairValue?.win?.fair_value ? Number(fairValue.win.fair_value).toLocaleString('pt-BR') : '176.715'}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Gap / Variação Justa:</span>
              <strong style={{ color: (fairValue?.win?.diff_points || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                {fairValue?.win?.diff_points !== undefined ? `${fairValue.win.diff_points > 0 ? '+' : ''}${Number(fairValue.win.diff_points).toLocaleString('pt-BR')} pts` : '-930 pts'}
              </strong>
            </div>
          </div>

          {/* Card Fair Value WDO */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <strong style={{ color: '#c084fc', fontSize: '0.95rem' }}>MINI DÓLAR (WDO)</strong>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 'bold', 
                padding: '0.2rem 0.55rem', 
                borderRadius: '4px',
                backgroundColor: (fairValue?.wdo?.diff_points || 0) < 0 ? 'rgba(16, 185, 129, 0.2)' : ((fairValue?.wdo?.diff_points || 0) > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'),
                color: (fairValue?.wdo?.diff_points || 0) < 0 ? '#10b981' : ((fairValue?.wdo?.diff_points || 0) > 0 ? '#ef4444' : '#60a5fa')
              }}>
                {fairValue?.wdo?.status || 'GAP DE BAIXA ESPERADO (-)'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>AJUSTE ANTERIOR (MT5)</span>
                <strong style={{ color: 'white', fontSize: '1.1rem' }}>
                  {fairValue?.wdo?.prev_close ? Number(fairValue.wdo.prev_close).toLocaleString('pt-BR', { minimumFractionDigits: 1 }) : '5.131,5'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>PREÇO JUSTO TEÓRICO</span>
                <strong style={{ color: '#c084fc', fontSize: '1.1rem' }}>
                  {fairValue?.wdo?.fair_value ? Number(fairValue.wdo.fair_value).toLocaleString('pt-BR', { minimumFractionDigits: 1 }) : '5.129,5'}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Gap / Variação Justa:</span>
              <strong style={{ color: (fairValue?.wdo?.diff_points || 0) <= 0 ? '#10b981' : '#ef4444' }}>
                {fairValue?.wdo?.diff_points ? `${fairValue.wdo.diff_points > 0 ? '+' : ''}${fairValue.wdo.diff_points} pts` : '-7,5 pts'}
              </strong>
            </div>
          </div>

        </div>
      </div>

      {/* Grid Principal: Equação da Abertura + Checklist Matinal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Coluna 1: Calculadora da Equação da Abertura */}
        <div>
          <PreMarketCalculator />
        </div>

        {/* Coluna 2: Checklist do Pré-Market & Instruções */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card Checklist do Trader */}
          <div className="card" style={{ borderLeft: '4px solid #3b82f6', backgroundColor: 'rgba(15, 23, 42, 0.85)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#60a5fa', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={20} /> Checklist da Abertura ({completedCount}/{checklist.length})
              </h3>
              <button 
                onClick={resetChecklist}
                style={{ 
                  background: 'transparent', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  color: 'var(--text-muted)', 
                  fontSize: '0.75rem', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Resetar
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {checklist.map(item => (
                <div 
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    backgroundColor: item.done ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.25)',
                    border: item.done ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {item.done ? (
                    <CheckSquare size={18} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                  ) : (
                    <Square size={18} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  )}
                  <span style={{ 
                    fontSize: '0.825rem', 
                    color: item.done ? '#6ee7b7' : 'white',
                    textDecoration: item.done ? 'line-through' : 'none',
                    lineHeight: '1.4'
                  }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card Matriz de Leitura da Equação */}
          <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#f59e0b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={18} /> Matriz da Equação: (-VIX) + FEF2! + CL1!
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
              • <strong>VIX (-)</strong>: Invertido. Queda no VIX reduz o medo global, favorecendo a alta do Mini Índice B3.<br />
              • <strong>FEF2! (+)</strong>: Minério de Ferro na Bolsa de Singapura. Impulsiona commodities e a Vale (VALE3).<br />
              • <strong>CL1! (+)</strong>: Petróleo WTI Futuro. Direciona ações da Petrobras (PETR4) e apetite a risco macro.
            </p>
          </div>

          {/* Dicas Táticas por Faixa de Sinal */}
          <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#38bdf8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} /> Diretrizes Táticas de Execução
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div style={{ borderLeft: '3px solid #10b981', paddingLeft: '0.6rem' }}>
                <strong style={{ color: '#10b981', display: 'block' }}>Sinal Positivo (&gt; +0.2)</strong>
                <span style={{ color: 'var(--text-muted)' }}>Viés de alta. Compras no teste de Vwap / Suportes ou rompidas com volume.</span>
              </div>
              <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: '0.6rem' }}>
                <strong style={{ color: '#ef4444', display: 'block' }}>Sinal Negativo (&lt; -0.2)</strong>
                <span style={{ color: 'var(--text-muted)' }}>Viés de baixa. Vendas no teste de Resistências / Vwap de ontem. Atenção com WDO.</span>
              </div>
              <div style={{ borderLeft: '3px solid #f59e0b', paddingLeft: '0.6rem' }}>
                <strong style={{ color: '#f59e0b', display: 'block' }}>Sinal Neutro (-0.2 a +0.2)</strong>
                <span style={{ color: 'var(--text-muted)' }}>Consolidação. Operar somente nos extremos do caixote com alvos curtos.</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Abertura;

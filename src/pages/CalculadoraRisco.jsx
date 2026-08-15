import { useState, useMemo } from 'react';
import { AlertTriangle, Calculator, Briefcase, Percent, Activity, TrendingUp, DollarSign, ShieldCheck, HeartPulse, Shuffle, Dices, Zap, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import AnimatedCounter from '../components/AnimatedCounter';
import './CalculadoraRisco.css';

// Valores financeiros por ponto/tick
const tickValue = {
  'WIN': 0.20, // 20 centavos por ponto no Míni Índice
  'WDO': 10.00, // 10 reais por ponto no Míni Dólar
  'ACAO': 1.00 // 1 real por 1 centavo (considerando stop em R$)
};

// Margem de garantia aproximada requerida por contrato/ação na Day Trade
const margemPadrao = {
  'WIN': 150.00,
  'WDO': 150.00,
  'ACAO': 0 // Para ações varia, simplificado
};

// Custo estimado de emolumentos B3 por contrato (ida e volta)
const custoEmolumentos = {
  'WIN': 0.50,
  'WDO': 2.50,
  'ACAO': 0.01 
};

// ── MOTOR PURISTA DE MONTE CARLO (1.000 Iterações Probabilísticas) ──
const runMonteCarloSimulation = (totalSims, numTrades, winRateInput, startCapital, riskPerTradePct, payoffInput) => {
  const winRate = winRateInput / 100;
  let ruinCount = 0;
  let maxDdSimulated = 0;
  const finalCapitals = [];
  const trajectories = [];

  let seed = 12345;
  const getNextRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let sim = 0; sim < totalSims; sim++) {
    let cap = startCapital;
    let peak = startCapital;
    let simMaxDd = 0;
    let ruined = false;

    const curve = [startCapital];

    for (let t = 0; t < numTrades; t++) {
      const isWin = getNextRandom() < winRate;
      const riskVal = cap * (riskPerTradePct / 100);
      const pnl = isWin ? riskVal * payoffInput : -riskVal;

      cap += pnl;

      if (cap > peak) peak = cap;
      const dd = peak > 0 ? ((peak - cap) / peak) * 100 : 0;
      if (dd > simMaxDd) simMaxDd = dd;

      if (cap <= startCapital * 0.3) {
        ruined = true;
      }

      curve.push(Math.round(cap));
    }

    if (ruined) ruinCount++;
    if (simMaxDd > maxDdSimulated) maxDdSimulated = simMaxDd;

    finalCapitals.push(cap);

    if (sim < 50) {
      trajectories.push(curve);
    }
  }

  finalCapitals.sort((a, b) => a - b);
  const p5Index = Math.floor(totalSims * 0.05);
  const p50Index = Math.floor(totalSims * 0.50);
  const p95Index = Math.floor(totalSims * 0.95);

  const p5Capital = Math.round(finalCapitals[p5Index] || 0);
  const p50Capital = Math.round(finalCapitals[p50Index] || 0);
  const p95Capital = Math.round(finalCapitals[p95Index] || 0);

  const ruinProbability = ((ruinCount / totalSims) * 100).toFixed(1);

  const chartData = [];
  const step = Math.max(1, Math.floor(numTrades / 20));
  for (let t = 0; t <= numTrades; t += step) {
    const sliceAtT = trajectories.map(tr => tr[t] || tr[tr.length - 1]).sort((a, b) => a - b);
    chartData.push({
      trade: `T#${t}`,
      P5_Pessimista: Math.round(sliceAtT[Math.floor(sliceAtT.length * 0.05)] || 0),
      P50_Mediana: Math.round(sliceAtT[Math.floor(sliceAtT.length * 0.50)] || 0),
      P95_Otimista: Math.round(sliceAtT[Math.floor(sliceAtT.length * 0.95)] || 0),
    });
  }

  return {
    p5Capital,
    p50Capital,
    p95Capital,
    ruinProbability,
    maxDdSimulated: maxDdSimulated.toFixed(1),
    chartData,
    totalSims
  };
};

const CalculadoraRisco = () => {
  const [modo, setModo] = useState('RISCO_AUTOMATICO'); // 'RISCO_AUTOMATICO' ou 'LOTE_FIXO'
  
  const [capital, setCapital] = useState(10000);
  const [riscoManual, setRiscoManual] = useState(1);
  const [loteManual, setLoteManual] = useState(5);
  
  const [ativo, setAtivo] = useState('WIN');
  const [stopLoss, setStopLoss] = useState(150);
  const [takeProfit, setTakeProfit] = useState(300);

  // Parâmetros do Simulador de Monte Carlo (1.000 cenários)
  const [simTradesCount, setSimTradesCount] = useState(100);
  const [winRateInput, setWinRateInput] = useState(55);
  const [payoffInput, setPayoffInput] = useState(1.8);
  const [riskPerTradePct, setRiskPerTradePct] = useState(1.5);

  const resultados = useMemo(() => {
    let quantidadeFinal = 0;
    let riscoPercentualFinal;
    let maxRiscoReais;

    const custoStopUmContrato = stopLoss * tickValue[ativo];

    if (modo === 'RISCO_AUTOMATICO') {
      maxRiscoReais = capital * (riscoManual / 100);
      riscoPercentualFinal = riscoManual;
      if (custoStopUmContrato > 0) {
        quantidadeFinal = Math.floor(maxRiscoReais / custoStopUmContrato);
      }
    } else {
      quantidadeFinal = loteManual;
      maxRiscoReais = quantidadeFinal * custoStopUmContrato;
      riscoPercentualFinal = capital > 0 ? (maxRiscoReais / capital) * 100 : 0;
    }

    const stopFinanceiroTotal = quantidadeFinal * custoStopUmContrato;
    const lucroFinanceiroTotal = quantidadeFinal * (takeProfit * tickValue[ativo]);
    const payoffRatio = stopFinanceiroTotal > 0 ? (lucroFinanceiroTotal / stopFinanceiroTotal) : 0;
    const custosTotais = ativo === 'ACAO' ? 0 : quantidadeFinal * custoEmolumentos[ativo];
    const margemTotal = quantidadeFinal * margemPadrao[ativo];
    const riscoLiquido = stopFinanceiroTotal + custosTotais;

    // Métricas Institucionais
    const tradesParaRuina = riscoLiquido > 0 ? Math.floor(capital / riscoLiquido) : 999;
    
    // Alocação Segura: Margem bloqueada + Caixa para aguentar 3 stops seguidos desse tamanho
    const alocacaoSegura = margemTotal + (riscoLiquido * 3);

    let alertaMsg = null;
    if (modo === 'RISCO_AUTOMATICO' && quantidadeFinal === 0) {
      alertaMsg = 'Capital ou % de risco insuficientes para este tamanho de Stop.';
    } else if (modo === 'LOTE_FIXO' && riscoPercentualFinal > 10) {
      alertaMsg = `Risco de ${riscoPercentualFinal.toFixed(1)}% detectado! Altíssima chance de ruína.`;
    }

    return {
      riscoPercentual: riscoPercentualFinal,
      capitalRisco: maxRiscoReais,
      contratos: quantidadeFinal,
      stopFinanceiro: stopFinanceiroTotal,
      lucroFinanceiro: lucroFinanceiroTotal,
      payoff: payoffRatio,
      custosB3: custosTotais,
      margemCorretora: margemTotal,
      riscoLiquido: riscoLiquido,
      alerta: alertaMsg,
      tradesParaRuina: tradesParaRuina,
      alocacaoSegura: alocacaoSegura > capital ? capital : alocacaoSegura
    };
  }, [capital, riscoManual, loteManual, ativo, stopLoss, takeProfit, modo]);

  // ── MOTOR DE MONTE CARLO: 1.000 Iterações Probabilísticas ──
  const monteCarloResults = useMemo(() => {
    return runMonteCarloSimulation(1000, simTradesCount, winRateInput, capital, riskPerTradePct, payoffInput);
  }, [simTradesCount, winRateInput, capital, riskPerTradePct, payoffInput]);

  const [activeTab, setActiveTab] = useState('RISK_CALC'); // 'RISK_CALC' ou 'MONTE_CARLO'

  return (
    <div className="home-container animate-fade-in calc-container">
      
      {/* Hero Header */}
      <section className="hero-section" style={{ padding: '1.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="hero-content" style={{ textAlign: 'left', flex: 1 }}>
          <h1 className="hero-title" style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={28} color="#38bdf8" /> Gestão Institucional de Risco & Monte Carlo
          </h1>
          <p className="hero-subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Motor quantitativo anti-ruína com dimensionamento de lote e 1.000 simulações probabilísticas.
          </p>
        </div>

        {/* Abas Principais de Seção */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button 
            onClick={() => setActiveTab('RISK_CALC')}
            style={{ 
              padding: '0.6rem 1.25rem', borderRadius: '7px', cursor: 'pointer', border: 'none', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s ease',
              background: activeTab === 'RISK_CALC' ? '#38bdf8' : 'transparent',
              color: activeTab === 'RISK_CALC' ? '#090d16' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Calculator size={16} /> Calculadora de Risco
          </button>
          <button 
            onClick={() => setActiveTab('MONTE_CARLO')}
            style={{ 
              padding: '0.6rem 1.25rem', borderRadius: '7px', cursor: 'pointer', border: 'none', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s ease',
              background: activeTab === 'MONTE_CARLO' ? '#818cf8' : 'transparent',
              color: activeTab === 'MONTE_CARLO' ? '#090d16' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Dices size={16} /> Simulador Monte Carlo (1.000x)
          </button>
        </div>
      </section>

      {/* ── SEÇÃO 1: CALCULADORA DE RISCO ────────────────────────── */}
      {activeTab === 'RISK_CALC' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start', marginBottom: '2.5rem' }}>
          
          {/* Coluna Esquerda: Configuração */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Calculator size={20} color="var(--primary-accent)" /> Parâmetros da Operação
                </h3>
                
                {/* Toggle Modo Auto Lote vs Lote Fixo */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button 
                    onClick={() => setModo('RISCO_AUTOMATICO')}
                    style={{ 
                      padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', border: 'none', fontWeight: 600, fontSize: '0.75rem',
                      background: modo === 'RISCO_AUTOMATICO' ? 'var(--primary-accent)' : 'transparent',
                      color: modo === 'RISCO_AUTOMATICO' ? '#090d16' : 'var(--text-muted)'
                    }}
                  >
                    Auto Lote
                  </button>
                  <button 
                    onClick={() => setModo('LOTE_FIXO')}
                    style={{ 
                      padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', border: 'none', fontWeight: 600, fontSize: '0.75rem',
                      background: modo === 'LOTE_FIXO' ? 'var(--warning)' : 'transparent',
                      color: modo === 'LOTE_FIXO' ? '#090d16' : 'var(--text-muted)'
                    }}
                  >
                    Lote Fixo
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Input Capital */}
                <div className="input-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <span><Briefcase size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Banca Total (R$)</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>R$ {capital.toLocaleString('pt-BR')}</span>
                  </label>
                  <input 
                    type="range" 
                    min="500" max="100000" step="500"
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    className="tactic-slider"
                  />
                </div>

                {/* Input Risco % ou Lote Fixo */}
                {modo === 'RISCO_AUTOMATICO' ? (
                  <div className="input-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <span><Percent size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Risco por Trade Máximo (%)</span>
                      <span style={{ color: riscoManual > 5 ? 'var(--danger)' : 'var(--warning)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{riscoManual}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="0.1" max="10" step="0.1"
                      value={riscoManual}
                      onChange={(e) => setRiscoManual(Number(e.target.value))}
                      className={`tactic-slider ${riscoManual > 5 ? 'danger-slider' : ''}`}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>Conservador (1%)</span>
                      <span>Agressivo (5%+)</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: '12px' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--warning)' }}>
                      <span><Shuffle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Quantidade Fixa (Lotes/Ações)</span>
                    </label>
                    <input 
                      type="number" 
                      value={loteManual}
                      min="1"
                      onChange={(e) => setLoteManual(Number(e.target.value))}
                      className="tactic-input"
                      style={{ textAlign: 'center', borderColor: 'var(--warning)', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                )}

                {/* Select Ativo */}
                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <Activity size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Ativo Operado
                  </label>
                  <select 
                    value={ativo} 
                    onChange={(e) => setAtivo(e.target.value)}
                    className="tactic-input"
                    style={{ fontSize: '1rem' }}
                  >
                    <option value="WIN">Míni Índice (WIN) - R$0,20/pt</option>
                    <option value="WDO">Míni Dólar (WDO) - R$10,00/pt</option>
                    <option value="ACAO">Ações (B3) - R$1,00/R$</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Input Stop Loss */}
                  <div className="input-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <span>Stop Técnico</span>
                    </label>
                    <input 
                      type="number" 
                      value={stopLoss}
                      onChange={(e) => setStopLoss(Number(e.target.value))}
                      className="tactic-input danger-input"
                      style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  
                  {/* Input Take Profit */}
                  <div className="input-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <span>Alvo (Gain)</span>
                    </label>
                    <input 
                      type="number" 
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(Number(e.target.value))}
                      className="tactic-input success-input"
                      style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>

              </div>
            </div>
            
            {/* Painel Anti-Quebra Institucional */}
            <div className={`ruin-panel ${resultados.tradesParaRuina < 20 ? 'critical' : 'safe'}`}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                <HeartPulse size={20} color={resultados.tradesParaRuina < 20 ? 'var(--danger)' : 'var(--success)'} /> Saúde da Conta (Anti-Ruína)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Margem de Ruína (Stop Losses Consecutivos p/ Quebrar)</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: resultados.tradesParaRuina < 20 ? 'var(--danger)' : 'var(--success)', lineHeight: '1', fontFamily: 'var(--font-mono)' }}>
                    <AnimatedCounter value={resultados.tradesParaRuina} decimals={0} suffix=" trades" />
                  </div>
                  {resultados.tradesParaRuina < 20 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.5rem' }}>Alerta Vermelho: Você está arriscando quebrar a conta muito rápido.</div>
                  )}
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Alocação Institucional Recomendada na Corretora</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-accent)', fontFamily: 'var(--font-mono)' }}>
                    R$ <AnimatedCounter value={resultados.alocacaoSegura} decimals={2} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Não envie R$ {capital} para a corretora. Envie apenas a margem necessária + fôlego para 3 trades, e deixe o resto na Renda Fixa. Isso blinda seu capital contra um "dia de fúria".
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Coluna Direita: Resultados */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div className={`speedometer-card ${resultados.riscoPercentual > 5 ? 'critical' : 'safe'}`}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                {modo === 'RISCO_AUTOMATICO' ? 'Tamanho Ideal de Mão' : 'Impacto Real da Sua Mão'}
              </h3>
              
              {resultados.alerta && modo === 'RISCO_AUTOMATICO' ? (
                <div style={{ color: 'var(--danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                  <AlertTriangle size={48} />
                  <p style={{ fontWeight: 'bold' }}>{resultados.alerta}</p>
                </div>
              ) : (
                <>
                  <div className="speedometer-value" style={{ fontFamily: 'var(--font-mono)' }}>
                    <AnimatedCounter value={resultados.contratos} decimals={0} />
                  </div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--text-main)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '500' }}>
                    {ativo === 'ACAO' ? 'Ações' : 'Mini Contratos'}
                  </div>
                  
                  {modo === 'LOTE_FIXO' && (
                    <div style={{ marginTop: '1.5rem', background: resultados.riscoPercentual > 5 ? 'var(--danger)' : 'var(--success)', color: resultados.riscoPercentual > 5 ? 'white' : 'black', padding: '0.75rem 1.5rem', borderRadius: '24px', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', fontFamily: 'var(--font-mono)' }}>
                      Expõe {resultados.riscoPercentual.toFixed(1)}% do Capital
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Payoff Card */}
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14}/> Payoff (Risco/Retorno)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  1 : {resultados.payoff.toFixed(1)}
                </div>
                <div className="payoff-bar-container">
                  <div className="payoff-bar-risk" style={{ width: `${100 / (1 + resultados.payoff)}%` }}></div>
                  <div className="payoff-bar-reward" style={{ width: `${(resultados.payoff * 100) / (1 + resultados.payoff)}%` }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  {resultados.payoff >= 2 ? 'Matemática favorável' : 'Matemática desfavorável'}
                </div>
              </div>
              
              {/* Lucro Projetado */}
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '3px solid var(--success)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Lucro Projetado (Bruto)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                  R$ <AnimatedCounter value={resultados.lucroFinanceiro} decimals={2} />
                </div>
              </div>
            </div>

            {/* Custos e Margem (Breakdown) */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                <DollarSign size={18} color="var(--primary-accent)" /> Detalhamento Operacional
              </h4>
              
              <div className="breakdown-row">
                <span style={{ color: 'var(--text-muted)' }}>Margem Bloqueada:</span>
                <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>R$ {resultados.margemCorretora.toFixed(2)}</span>
              </div>
              
              <div className="breakdown-row">
                <span style={{ color: 'var(--text-muted)' }}>Custos B3 (Estimativa):</span>
                <span style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>- R$ {resultados.custosB3.toFixed(2)}</span>
              </div>

              <div className="breakdown-row">
                <span style={{ color: 'var(--text-muted)' }}>Stop Loss Financeiro:</span>
                <span style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>- R$ {resultados.stopFinanceiro?.toFixed(2)}</span>
              </div>

              <div className="breakdown-row" style={{ marginTop: '0.5rem', borderBottom: 'none', background: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>Risco Líquido Real:</span>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                  - R$ <AnimatedCounter value={resultados.riscoLiquido} decimals={2} />
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── SEÇÃO 2: MONTE CARLO SIMULATOR ──────────────────────────── */}
      {activeTab === 'MONTE_CARLO' && (
        <section className="glass-panel" style={{ padding: '2rem', borderRadius: '20px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <Dices size={24} color="#818cf8" /> Simulador de Monte Carlo (1.000 Trajetórias Probabilísticas)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.4rem 0 0 0' }}>
                Projeção estocástica simulando 1.000 sequências aleatórias de trades para testar a resistência matemática da sua banca.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(129,140,248,0.12)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(129,140,248,0.3)', fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              <Zap size={14} /> 1.000 Simulações Ativas
            </div>
          </div>

          {/* Inputs de Controle Monte Carlo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem', background: 'rgba(0,0,0,0.25)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Trades Projetados</label>
              <input 
                type="number" min="10" max="1000" step="10"
                value={simTradesCount}
                onChange={(e) => setSimTradesCount(Number(e.target.value))}
                className="tactic-input"
                style={{ fontSize: '1rem', padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Win Rate Estimado (%)</label>
              <input 
                type="number" min="10" max="95" step="1"
                value={winRateInput}
                onChange={(e) => setWinRateInput(Number(e.target.value))}
                className="tactic-input"
                style={{ fontSize: '1rem', padding: '0.6rem 0.8rem', color: '#34d399', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Payoff R:R (Ex: 1.8)</label>
              <input 
                type="number" min="0.5" max="10" step="0.1"
                value={payoffInput}
                onChange={(e) => setPayoffInput(Number(e.target.value))}
                className="tactic-input"
                style={{ fontSize: '1rem', padding: '0.6rem 0.8rem', color: '#fbbf24', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Risco por Trade (%)</label>
              <input 
                type="number" min="0.1" max="15" step="0.1"
                value={riskPerTradePct}
                onChange={(e) => setRiskPerTradePct(Number(e.target.value))}
                className="tactic-input"
                style={{ fontSize: '1rem', padding: '0.6rem 0.8rem', color: riskPerTradePct > 5 ? '#f87171' : '#818cf8', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          {/* Métricas dos Cenários P5, P50, P95 & Ruína */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
            
            {/* Alerta de Ruína */}
            <div style={{ background: Number(monteCarloResults.ruinProbability) > 5 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', border: `1px solid ${Number(monteCarloResults.ruinProbability) > 5 ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`, padding: '1.25rem', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Probabilidade de Ruína (Quebra)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: Number(monteCarloResults.ruinProbability) > 5 ? '#f87171' : '#34d399', fontFamily: 'var(--font-mono)' }}>
                {monteCarloResults.ruinProbability}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {Number(monteCarloResults.ruinProbability) > 5 ? '⚠️ Risco inaceitável de ruína!' : '✅ Matemática altamente segura'}
              </div>
            </div>

            {/* Cenário Pessimista P5 */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '4px' }}>Cenário Pessimista (P5 - 5% Pior)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                R$ {monteCarloResults.p5Capital.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Pior cenário estatístico esperado</div>
            </div>

            {/* Cenário Mediano P50 */}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', padding: '1.25rem', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: '#818cf8', marginBottom: '4px' }}>Cenário Mediano (P50 - Tendência)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                R$ {monteCarloResults.p50Capital.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Resultado mediano estatístico</div>
            </div>

            {/* Cenário Otimista P95 */}
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', padding: '1.25rem', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: '#34d399', marginBottom: '4px' }}>Cenário Otimista (P95 - 5% Melhor)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                R$ {monteCarloResults.p95Capital.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Projeção de alta performance</div>
            </div>

          </div>

          {/* Gráfico de Bandas de Incerteza Recharts */}
          <div style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart2 size={16} color="#818cf8" /> Curvas de Patrimônio Simuladas (Bandas P5, P50, P95)
            </h4>
            
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monteCarloResults.chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorP5" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="trade" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff' }}
                  formatter={(val) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, '']}
                />
                <Area type="monotone" dataKey="P95_Otimista" stroke="#34d399" fillOpacity={1} fill="url(#colorP95)" name="P95 (Otimista)" />
                <Area type="monotone" dataKey="P50_Mediana" stroke="#818cf8" fillOpacity={1} fill="url(#colorP50)" name="P50 (Mediana)" />
                <Area type="monotone" dataKey="P5_Pessimista" stroke="#f87171" fillOpacity={1} fill="url(#colorP5)" name="P5 (Pessimista)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </section>
      )}

    </div>
  );
};

export default CalculadoraRisco;

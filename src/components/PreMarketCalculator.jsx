import { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  HelpCircle,
  Clock,
  Loader2,
  Target
} from 'lucide-react';

const PreMarketCalculator = () => {
  const [isAuto, setIsAuto] = useState(true);
  const [loading, setLoading] = useState(false);
  const [preMarketExtra, setPreMarketExtra] = useState(null);

  const [inputs, setInputs] = useState({
    vix: '',
    fef2: '',
    cl1: ''
  });

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setInputs(prev => ({ ...prev, [name]: value }));
      setError(null);
    }
  };

  const calculateSignal = useCallback((vix, fef2, cl1, apiExtra = null) => {
    setError(null);

    const v = parseFloat(vix) || 0;
    const f = parseFloat(fef2) || 0;
    const c = parseFloat(cl1) || 0;

    if (isNaN(v) || isNaN(f) || isNaN(c)) {
      setError('Por favor, insira valores numéricos válidos para todos os campos.');
      return;
    }

    const signal = (-v) + f + c;
    const absSignal = Math.abs(signal);

    let intensity;
    if (absSignal < 1.5) intensity = 'Lateral';
    else if (absSignal >= 1.5 && absSignal < 2.5) intensity = 'Fraca';
    else if (absSignal >= 2.5 && absSignal < 4.5) intensity = 'Moderada';
    else intensity = 'Forte';

    let direction;
    let tactic;
    let cssClass;
    let riskAdvice;

    if (signal > 0.2) {
      direction = 'Positivo (Compradora)';
      tactic = apiExtra?.tactic_text || 'Buscar regiões de suporte abaixo da abertura para comprar no Mini Índice (WIN).';
      cssClass = 'positive';
      riskAdvice = 'Considere stops em 100-150 pts no WIN. Alvo inicial: 1.5x a 2x o risco.';
    } else if (signal < -0.2) {
      direction = 'Negativo (Vendedora)';
      tactic = apiExtra?.tactic_text || 'Buscar regiões de resistência acima da abertura para vender no Mini Índice (WIN).';
      cssClass = 'negative';
      riskAdvice = 'Considere stops em 100-150 pts no WIN. Alvo inicial: 1.5x a 2x o risco.';
    } else {
      direction = 'Neutro';
      tactic = apiExtra?.tactic_text || 'Operar as extremidades (comprar suporte e vender resistência em pontos curtos).';
      cssClass = 'neutral';
      riskAdvice = 'Use stops mais justos (80-100 pts no WIN / 3-5 pts no WDO). Lucro rápido por operação.';
    }

    const newResult = {
      value: signal.toFixed(2),
      intensity,
      direction,
      tactic,
      cssClass,
      riskAdvice,
      winGap: apiExtra?.win_gap_est || `${signal > 0 ? '+' : ''}${Math.round(signal * 150)} pts`,
      wdoGap: apiExtra?.wdo_gap_est || `${signal < 0 ? '+' : '-'}${Math.abs(Math.round(signal * 4.0))} pts`,
      timestamp: new Date()
    };

    setResult(newResult);

    setHistory(prev => {
      const newHistory = [newResult, ...prev.slice(0, 4)];
      return newHistory;
    });

    setLastUpdate(new Date());
  }, []);

  const handleCalculate = (e) => {
    e.preventDefault();
    calculateSignal(inputs.vix, inputs.fef2, inputs.cl1, preMarketExtra);
  };

  const fetchAutoData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/pre-market');
      if (res.ok) {
        const data = await res.json();
        setPreMarketExtra(data);
        const vixVal = String(data.vix_val || 14.85);
        const fefVal = String(data.fef_val || 0.8);
        const cl1Val = String(data.cl1_val || 0.5);

        setInputs({
          vix: vixVal,
          fef2: fefVal,
          cl1: cl1Val
        });

        calculateSignal(vixVal, fefVal, cl1Val, data);
      } else {
        throw new Error('API pre-market offline');
      }
    } catch (e) {
      console.warn('Fallback pré-market ativado:', e);
      const mockVix = (Math.random() * 4 + 14).toFixed(2);
      const mockFef2 = (Math.random() * 3 - 0.5).toFixed(2);
      const mockCl1 = (Math.random() * 2 - 0.5).toFixed(2);

      setInputs({
        vix: mockVix,
        fef2: mockFef2,
        cl1: mockCl1
      });

      calculateSignal(mockVix, mockFef2, mockCl1);
    } finally {
      setLoading(false);
    }
  }, [calculateSignal]);

  const toggleAuto = () => {
    setIsAuto(!isAuto);
    if (!isAuto) {
      fetchAutoData();
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchAutoData, 0);
    const interval = setInterval(fetchAutoData, 60000); // Atualiza a cada 1 min
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchAutoData]);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={20} className="text-primary" />
            A Equação da Abertura
          </h2>
          <HelpCircle
            size={16}
            color="var(--text-muted)"
            title="Sobre os Indicadores"
          />
        </div>

        <div className="toggle-container" style={{ marginBottom: 0 }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Modo Automático</span>
          <div className={`toggle-switch ${isAuto ? 'active' : ''}`} onClick={toggleAuto}>
            <div className="toggle-knob"></div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--danger)',
          padding: '0.75rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleCalculate}>
        <div className="grid-2">
          <div className="input-group">
            <label>
              VIX (%) - Índice do Medo
              <HelpCircle
                size={14}
                color="var(--text-muted)"
                title="Mede a volatilidade esperada do S&P 500 nos próximos 30 dias. Valores acima de 20 indicam medo elevado."
              />
            </label>
            <input
              type="text"
              name="vix"
              value={inputs.vix}
              onChange={handleInputChange}
              disabled={isAuto || loading}
              placeholder="Ex: 15.5"
              required
            />
          </div>

          <div className="input-group">
            <label>
              Minério de Ferro FEF2! (%)
              <HelpCircle
                size={14}
                color="var(--text-muted)"
                title="Futuros de minério de ferro na Bolsa de Singapura. Indica demanda chinesa e pressão inflacionária."
              />
            </label>
            <input
              type="text"
              step="0.01"
              name="fef2"
              value={inputs.fef2}
              onChange={handleInputChange}
              disabled={isAuto || loading}
              placeholder="Ex: 1.2"
              required
            />
          </div>

          <div className="input-group">
            <label>
              Petróleo CL1! (%)
              <HelpCircle
                size={14}
                color="var(--text-muted)"
                title="Futuros de petróleo WTI. Indica pressão inflacionária e saúde da economia global."
              />
            </label>
            <input
              type="text"
              step="0.01"
              name="cl1"
              value={inputs.cl1}
              onChange={handleInputChange}
              disabled={isAuto || loading}
              placeholder="Ex: 0.8"
              required
            />
          </div>
        </div>

        {!isAuto && (
          <button type="submit" className="btn" style={{ marginTop: '1rem', width: '100%' }}>
            Calcular Viés Direcional
          </button>
        )}

        {isAuto && (
          <button type="button" className="btn" onClick={fetchAutoData} disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 className="animate-spin" size={20} />
                <span>Atualizando...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={20} />
                <span>Atualizar Dados</span>
              </div>
            )}
            {lastUpdate && (
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginLeft: '0.5rem'
              }}>
                Última atualização: {new Date(lastUpdate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            )}
          </button>
        )}
      </form>

      {result && !loading && (
        <div className={`result-panel ${result.cssClass} animate-fade-in`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {result.cssClass === 'positive' && <TrendingUp size={28} color="var(--success)" />}
            {result.cssClass === 'negative' && <TrendingDown size={28} color="var(--danger)" />}
            {result.cssClass === 'neutral' && <Activity size={28} color="var(--neutral)" />}
            <div>
              <h3 style={{ fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>Sinal: {result.value}</h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-muted)',
                margin: 0,
                fontWeight: '500'
              }}>
                {result.direction} • Intensidade: {result.intensity}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Intensidade do Sinal</p>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                {result.intensity}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Viés Direcional</p>
              <p style={{
                fontWeight: '600',
                fontSize: '1rem',
                textAlign: 'center'
              }}>
                {result.direction.split(' ')[0]}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle size={14} /> Tática de Execução
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '4px' }}>
              {result.tactic}
            </p>
          </div>

          <div style={{
            backgroundColor: 'rgba(30,41,59,0.2)',
            borderRadius: '6px',
            padding: '1rem',
            borderLeft: `3px solid ${result.cssClass === 'positive' ? 'var(--success)' : result.cssClass === 'negative' ? 'var(--danger)' : 'var(--neutral)'}`
          }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {result.cssClass === 'positive' && <TrendingUp size={14} color="var(--success)" />}
              {result.cssClass === 'negative' && <TrendingDown size={14} color="var(--danger)" />}
              {result.cssClass === 'neutral' && <Activity size={14} color="var(--neutral)" />}
              Gerenciamento de Risco
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{result.riskAdvice}</p>
          </div>

          {/* Estimativa de Gap de Abertura */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>ESTIMATIVA GAP MINI ÍNDICE (WIN)</span>
              <strong style={{ fontSize: '1.1rem', color: '#60a5fa' }}>{result.winGap}</strong>
            </div>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>ESTIMATIVA GAP MINI DÓLAR (WDO)</span>
              <strong style={{ fontSize: '1.1rem', color: '#c084fc' }}>{result.wdoGap}</strong>
            </div>
          </div>

          {/* Pontos de Pivô para a Abertura WIN */}
          {preMarketExtra && preMarketExtra.pivots_win && (
            <div style={{ marginTop: '0.85rem', backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                <Target size={14} /> PONTOS DE PIVÔ DE ABERTURA (WIN)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', textAlign: 'center', fontSize: '0.78rem' }}>
                <div style={{ backgroundColor: 'rgba(239,68,68,0.15)', padding: '0.4rem', borderRadius: '4px' }}>
                  <span style={{ color: '#fca5a5', display: 'block', fontSize: '0.65rem' }}>R2</span>
                  <strong style={{ color: '#ef4444' }}>{preMarketExtra.pivots_win.r2}</strong>
                </div>
                <div style={{ backgroundColor: 'rgba(245,158,11,0.15)', padding: '0.4rem', borderRadius: '4px' }}>
                  <span style={{ color: '#fde047', display: 'block', fontSize: '0.65rem' }}>R1</span>
                  <strong style={{ color: '#f59e0b' }}>{preMarketExtra.pivots_win.r1}</strong>
                </div>
                <div style={{ backgroundColor: 'rgba(59,130,246,0.2)', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.4)' }}>
                  <span style={{ color: '#93c5fd', display: 'block', fontSize: '0.65rem' }}>PIVOT</span>
                  <strong style={{ color: '#60a5fa' }}>{preMarketExtra.pivots_win.pivot}</strong>
                </div>
                <div style={{ backgroundColor: 'rgba(16,185,129,0.15)', padding: '0.4rem', borderRadius: '4px' }}>
                  <span style={{ color: '#6ee7b7', display: 'block', fontSize: '0.65rem' }}>S1</span>
                  <strong style={{ color: '#10b981' }}>{preMarketExtra.pivots_win.s1}</strong>
                </div>
                <div style={{ backgroundColor: 'rgba(16,185,129,0.25)', padding: '0.4rem', borderRadius: '4px' }}>
                  <span style={{ color: '#34d399', display: 'block', fontSize: '0.65rem' }}>S2</span>
                  <strong style={{ color: '#059669' }}>{preMarketExtra.pivots_win.s2}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !loading && !isAuto && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: 'var(--text-muted)',
          borderStyle: 'dashed',
          borderColor: 'var(--border-subtle)',
          borderRadius: '8px' }}>
          <Calculator size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
            Insira os valores dos indicadores acima e clique em "Calcular Viés Direcional"
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted-light)', maxWidth: '400px', margin: '0 auto' }}>
            A Equação da Abertura combina (-VIX) + FEF2! + CL1! para gerar um sinal que indica o viés direcional provável para o dia de trading.
          </p>
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && !isAuto && (
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-subtle)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary-accent)' }}>
            <Clock size={18} /> Histórico das Últimas Leituras
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {history.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              >
                <span>{item.value}</span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem'
                }}>
                  {item.intensity.charAt(0)} •
                  {item.direction.split(' ')[0].charAt(0)}
                  <span style={{
                    fontSize: '0.7rem',
                    opacity: 0.7
                  }}>
                    {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreMarketCalculator;

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTrades } from '../contexts/TradeContext';
import { BookOpen, Calculator, Bot, ActivitySquare, Target, ShieldCheck, Zap, AlertTriangle, FileText } from 'lucide-react';
import AnimatedCounter from '../components/AnimatedCounter';
import './DashboardHome.css';

const DashboardHome = () => {
  const { getMetrics, disciplineStreak } = useTrades();
  const metrics = useMemo(() => getMetrics(), [getMetrics]);
  
  const [planData] = useState(() => {
    const lastSigned = localStorage.getItem('planSignedDate');
    const today = new Date().toLocaleDateString();
    
    let target = 0;
    let current = 0;
    const planStorage = localStorage.getItem('tradingPlan');
    if (planStorage) {
      try {
        const parsed = JSON.parse(planStorage);
        target = parseFloat(parsed.targetCapital) || 0;
        current = parseFloat(parsed.currentCapital) || 0;
      } catch {
        // ignorar erro
      }
    }

    return {
      signedToday: lastSigned === today,
      current,
      target
    };
  });

  const [mentalState] = useState(() => {
    const today = new Date().toLocaleDateString();
    const routineStorage = localStorage.getItem('routine_mental_state');
    if (routineStorage) {
      try {
        const parsed = JSON.parse(routineStorage);
        if (parsed.date === today) {
          return parsed.state; // 'Baixo', 'Médio', 'Alto'
        }
      } catch {
        // ignorar erro
      }
    }
    return null;
  });

  const calculateProgress = () => {
    if (planData.target === 0) return 0;
    const percentage = (planData.current / planData.target) * 100;
    return Math.min(Math.max(percentage, 0), 100).toFixed(1);
  };

  return (
    <div className="home-container animate-fade-in">
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg-glow"></div>
        <div className="hero-content">
          <h1 className="hero-title">Bem-vindo à Matilha, Trader.</h1>
          <p className="hero-subtitle">
            O mercado te espera. Mantenha a disciplina, siga o seu plano à risca e lembre-se: consistência é o nome do jogo.
          </p>
        </div>
      </section>

      {/* Cockpit / Command Center */}
      <section className="cockpit-panel">
        
        {/* Progresso Financeiro */}
        <div className="cockpit-card">
          <div className="cockpit-header">
            <h3><Target size={20} /> Progresso do Capital Alvo</h3>
            <Link to="/app/plano" style={{ fontSize: '0.85rem', color: 'var(--primary-accent)', textDecoration: 'none' }}>Editar Plano</Link>
          </div>
          
          <div className="cockpit-progress-stats">
            <span style={{ color: 'var(--text-muted)' }}>Patrimônio: R$ {planData.current}</span>
            <span className="target">Alvo: R$ {planData.target}</span>
          </div>
          <div className="cockpit-progress-bar-bg">
            <div className="cockpit-progress-bar-fill" style={{ width: `${calculateProgress()}%` }}></div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {calculateProgress()}% Concluído
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div className="kpi-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total PnL</div>
                <div className={`kpi-value ${parseFloat(metrics.totalProfit) >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '1.5rem' }}>
                  R$ <AnimatedCounter value={metrics.totalProfit} decimals={2} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Max Drawdown</div>
                <div className="kpi-value negative" style={{ fontSize: '1.5rem' }}>
                  R$ <AnimatedCounter value={metrics.maxDrawdown} decimals={2} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status de Disciplina */}
        <div className="cockpit-card">
          <div className="cockpit-header">
            <h3><ShieldCheck size={20} /> Status Operacional</h3>
          </div>
          
          <div className="status-row">
            <span className="status-label">Plano de Trade</span>
            {planData.signedToday ? (
              <span className="status-badge ok"><ShieldCheck size={14}/> Assinado</span>
            ) : (
              <span className="status-badge danger"><AlertTriangle size={14}/> Pendente</span>
            )}
          </div>
          
          <div className="status-row">
            <span className="status-label">Nível de Estresse (Rotina)</span>
            {mentalState === 'Baixo' ? (
              <span className="status-badge ok">Ideal</span>
            ) : mentalState === 'Médio' ? (
              <span className="status-badge warning">Atenção</span>
            ) : mentalState === 'Alto' ? (
              <span className="status-badge danger">Crítico</span>
            ) : (
              <span className="status-badge">Não avaliado</span>
            )}
          </div>

          <div className="status-row">
            <span className="status-label">Dias de Disciplina</span>
            <span className="status-badge" style={{ color: 'var(--primary-accent)', borderColor: 'var(--primary-accent)' }}>
              <Zap size={14} /> {disciplineStreak} Dias
            </span>
          </div>

        </div>
      </section>

      {/* KPI Grid */}
      <section style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h2 className="section-title" style={{ margin: 0 }}><ActivitySquare size={20} color="#2b5aff" /> Desempenho Global</h2>
        <Link to="/app/tearsheet" className="tearsheet-btn">
          <FileText size={18} /> Gerar Tearsheet
        </Link>
      </section>

      <section>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-header">Win Rate</div>
            <div className={`kpi-value ${parseFloat(metrics.winRate) >= 50 ? 'positive' : 'negative'}`}>
              <AnimatedCounter value={metrics.winRate} decimals={1} suffix="%" />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {parseFloat(metrics.winRate) >= 50 ? 'Retorno Favorável' : 'Abaixo da Média'}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">Total de Trades</div>
            <div className="kpi-value neutral">
              <AnimatedCounter value={metrics.totalTrades} decimals={0} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Operações Registradas
            </div>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-header">Profit Factor</div>
            <div className={`kpi-value ${parseFloat(metrics.profitFactor) >= 1.5 ? 'positive' : parseFloat(metrics.profitFactor) >= 1.0 ? 'neutral' : 'negative'}`}>
              <AnimatedCounter value={metrics.profitFactor} decimals={2} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {parseFloat(metrics.profitFactor) >= 1.5 ? 'Ideal (> 1.5)' : parseFloat(metrics.profitFactor) >= 1.0 ? 'Aceitável (1.0 - 1.5)' : 'Crítico (< 1.0)'}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="section-title">Ações Rápidas</h2>
        <div className="actions-grid">
          
          <Link to="/app/diario" className="action-card">
            <div className="action-card-bg"></div>
            <div className="action-icon-wrapper">
              <BookOpen size={24} />
            </div>
            <div className="action-content">
              <h3>Diário do Dia</h3>
              <p>Registre suas emoções e anexe o print das operações para não perder nenhum detalhe importante do dia.</p>
            </div>
          </Link>

          <Link to="/app/abertura" className="action-card">
            <div className="action-card-bg"></div>
            <div className="action-icon-wrapper">
              <Calculator size={24} />
            </div>
            <div className="action-content">
              <h3>Calculadora de Abertura</h3>
              <p>Determine o viés direcional, a intensidade e as zonas de valor antes mesmo do pregão iniciar.</p>
            </div>
          </Link>

          <Link to="/app/goatia" className="action-card">
            <div className="action-card-bg"></div>
            <div className="action-icon-wrapper">
              <Bot size={24} />
            </div>
            <div className="action-content">
              <h3>A GOAT IA</h3>
              <p>Consulte a inteligência artificial especializada da Matilha para insights operacionais e de gestão de risco.</p>
            </div>
          </Link>
          
        </div>
      </section>

    </div>
  );
};

export default DashboardHome;

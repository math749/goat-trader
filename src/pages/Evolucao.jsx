import { useMemo, Fragment } from 'react';
import { TrendingUp, Shield, Swords, Zap, Award, BarChart2 } from 'lucide-react';
import { useTrades } from '../contexts/TradeContext';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import './DashboardHome.css'; // Reutilizando algumas animações e utilitários

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#c084fc'];

const Evolucao = () => {
  const { trades, getMetrics } = useTrades();
  const metrics = useMemo(() => getMetrics(), [getMetrics]);

  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    const reversedTrades = [...trades].reverse();
    let saldo = 0;
    return reversedTrades.map((trade, index) => {
      const resultStr = trade['resultado líquido'] || trade['resultado'] || trade['Resultado (R$)'] || trade['total'] || '0';
      const numericResult = parseFloat(String(resultStr).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
      saldo += numericResult;
      const dataHora = trade['abertura'] || trade['data'] || trade['hora'] || trade['Abertura'] || trade['Data'] || `Trade ${index + 1}`;
      return {
        name: dataHora,
        Trade: numericResult,
        Acumulado: parseFloat(saldo.toFixed(2))
      };
    });
  }, [trades]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getTraderLevel = () => {
    let score = 0;
    if (metrics.winRate >= 50) score += 20;
    if (metrics.winRate >= 60) score += 10;
    if (metrics.profitFactor >= 1) score += 20;
    if (metrics.profitFactor >= 1.5) score += 20;
    if (metrics.payoff >= 1) score += 20;
    if (parseFloat(metrics.totalProfit) > 0) score += 10;

    if (score < 40) return { title: 'Sobrevivente', color: 'var(--danger)' };
    if (score < 70) return { title: 'Amador', color: 'var(--warning)' };
    if (score < 90) return { title: 'Consistente', color: 'var(--success)' };
    return { title: 'Elite', color: 'var(--primary-accent)' };
  };

  const level = getTraderLevel();

  if (trades.length === 0) {
    return (
      <div className="home-container animate-fade-in">
        <section className="hero-section">
          <div className="hero-bg-glow"></div>
          <div className="hero-content">
            <h1 className="hero-title">Evolução do Trader</h1>
            <p className="hero-subtitle">Importe seus dados na aba Histórico para visualizar seus gráficos.</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="home-container animate-fade-in" style={{ paddingBottom: '2rem' }}>
      
      {/* Hero Header */}
      <section className="hero-section" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="hero-bg-glow" style={{ opacity: 0.5 }}></div>
        <div className="hero-content" style={{ textAlign: 'left', flex: 1 }}>
          <h1 className="hero-title" style={{ fontSize: '2rem' }}><TrendingUp style={{ marginRight: '10px', verticalAlign: 'middle', display: 'inline-block' }} />Evolução do Trader</h1>
          <p className="hero-subtitle" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>Análise de performance, curva de capital e inteligência de risco.</p>
        </div>
        
        <div className="glass-panel" style={{ padding: '1rem 2rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.5rem', border: `1px solid ${level.color}40`, background: 'rgba(9, 9, 11, 0.6)' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Nível do Trader</span>
            <div style={{ color: level.color, fontSize: '1.5rem', fontWeight: 'bold' }}>{level.title}</div>
          </div>
          <Award size={36} color={level.color} style={{ filter: `drop-shadow(0 0 10px ${level.color}80)` }} />
        </div>
      </section>

      {/* Main Equity Curve */}
      <section style={{ marginBottom: '2rem' }}>
        <div className="kpi-card" style={{ padding: '1.5rem', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--primary-accent)" />
            Curva de Capital (Resultado Acumulado)
          </h3>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-accent)" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="var(--primary-accent)" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickMargin={12} minTickGap={40} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(value) => `R$ ${value}`} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'var(--border-subtle)', borderRadius: '12px', color: 'var(--text-main)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                  itemStyle={{ color: 'var(--primary-accent)', fontWeight: 'bold' }}
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="Acumulado" stroke="var(--primary-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorAcumulado)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--text-main)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Advanced Stats Grid */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 className="section-title">Análise de Risco & Retorno</h2>
        <div className="kpi-grid">
          
          <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} color="#c084fc"/> Profit Factor</div>
              <div className="kpi-value neutral">{metrics.profitFactor}</div>
            </div>
            <div style={{ fontSize: '0.8rem', color: metrics.profitFactor >= 1.5 ? 'var(--success)' : 'var(--text-muted)', marginTop: '1rem' }}>
              {metrics.profitFactor >= 1.5 ? 'Excelente proporção' : 'Abaixo de 1.5 requer atenção'}
            </div>
          </div>

          <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} color="#34d399"/> Payoff Médio</div>
              <div className="kpi-value neutral">{metrics.payoff}</div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>Relação Média de Ganho / Perda</div>
          </div>

          <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Swords size={16} color="#fbbf24"/> Streaks (Vitórias / Derrotas)</div>
              <div className="kpi-value neutral">
                <span style={{ color: 'var(--success)' }}>{metrics.maxWinningStreak}</span> <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>x</span> <span style={{ color: 'var(--danger)' }}>{metrics.maxLosingStreak}</span>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>Máximas sequências consecutivas</div>
          </div>
          
          <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '2px solid var(--danger)' }}>
            <div>
              <div className="kpi-header">Drawdown Máximo</div>
              <div className="kpi-value negative">R$ {metrics.maxDrawdown}</div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '1rem', opacity: 0.8 }}>Rebaixamento máx. do capital</div>
          </div>

        </div>
      </section>

      {/* Breakdowns */}
      <section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          
          {/* Day of Week Performance */}
          <div className="kpi-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1rem' }}>Resultado por Dia da Semana</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={metrics.dayOfWeekPerformance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => `R$${val}`} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'var(--border-subtle)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                    formatter={(val) => [formatCurrency(val), 'Resultado']}
                  />
                  <Bar dataKey="profit" radius={[6, 6, 6, 6]} barSize={40}>
                    {metrics.dayOfWeekPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? 'var(--success)' : 'var(--danger)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Asset Performance */}
          <div className="kpi-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1rem' }}>Resultado por Ativo</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={metrics.assetPerformance}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="profit"
                    nameKey="name"
                    stroke="none"
                  >
                    {metrics.assetPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'var(--border-subtle)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                    formatter={(val) => [formatCurrency(val), 'Resultado']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--text-main)' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </section>

      {/* Advanced Data Visualization */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 className="section-title">Visualização Avançada (Edge Discovery)</h2>
        
        {/* Scatter Plot */}
        <div className="kpi-card" style={{ padding: '1.5rem', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--primary-accent)" />
            Risco vs Retorno (Horário x Resultado)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Cada ponto representa uma operação. Ajuda a identificar se perdas graves ocorrem em momentos específicos do dia.</p>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  type="number" 
                  dataKey="timeNumeric" 
                  name="Hora" 
                  domain={[9, 18]} 
                  stroke="var(--text-muted)" 
                  tickFormatter={(val) => `${Math.floor(val)}h`}
                />
                <YAxis 
                  type="number" 
                  dataKey="profit" 
                  name="Resultado" 
                  stroke="var(--text-muted)" 
                  tickFormatter={(val) => `R$${val}`}
                />
                <ZAxis type="number" range={[40, 40]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }}
                  contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'var(--border-subtle)', borderRadius: '12px' }}
                  formatter={(value, name, props) => {
                    if (name === 'Hora') return [props.payload.timeStr, 'Horário'];
                    return [formatCurrency(value), 'Resultado'];
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Scatter name="Trades Vencedores" data={metrics.scatterData?.filter(d => d.isWin)} fill="var(--success)" />
                <Scatter name="Trades Perdedores" data={metrics.scatterData?.filter(d => !d.isWin)} fill="var(--danger)" />
                <Legend />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmap */}
        <div className="kpi-card" style={{ padding: '1.5rem', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--primary-accent)" />
            Mapa de Calor (Dias vs Horários)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Zonas verdes representam seus Horários de Ouro. Zonas vermelhas são seus Horários Tóxicos.</p>
          
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(10, 1fr)', gap: '4px', minWidth: '700px' }}>
              {/* Header: Hours */}
              <div></div>
              {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
                <div key={h} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h}h</div>
              ))}
              
              {/* Rows: Days */}
              {[
                { id: 1, label: 'Segunda' },
                { id: 2, label: 'Terça' },
                { id: 3, label: 'Quarta' },
                { id: 4, label: 'Quinta' },
                { id: 5, label: 'Sexta' }
              ].map(day => (
                <Fragment key={day.id}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{day.label}</div>
                  {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(hour => {
                    const cellData = metrics.heatmapData?.find(d => d.day === day.id && d.hour === hour);
                    const profit = cellData ? cellData.profit : 0;
                    
                    // Calculando a intensidade da cor (simples linear)
                    const maxAbs = Math.max(...(metrics.heatmapData?.map(d => Math.abs(d.profit)) || [1]));
                    const intensity = Math.min(Math.abs(profit) / (maxAbs || 1), 1);
                    
                    let bgColor = 'rgba(255,255,255,0.02)';
                    if (profit > 0) bgColor = `rgba(52, 211, 153, ${Math.max(0.2, intensity)})`;
                    else if (profit < 0) bgColor = `rgba(248, 113, 113, ${Math.max(0.2, intensity)})`;

                    return (
                      <div 
                        key={hour} 
                        title={`R$ ${profit.toFixed(2)}`}
                        style={{
                          backgroundColor: bgColor,
                          height: '40px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          color: 'rgba(255,255,255,0.7)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          cursor: 'default'
                        }}
                      >
                        {profit !== 0 ? (profit > 0 ? '+' : '') + Math.round(profit) : ''}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Evolucao;

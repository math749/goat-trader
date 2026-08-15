import { useState, useMemo } from 'react';
import { Briefcase, TrendingUp, DollarSign, Plus, AlertCircle, PieChart as PieChartIcon, ArrowRight, Shield, Zap, Globe, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

// --- MOCK DATA: BANCO DE DADOS DE FUNDAMENTOS B3 ---
// Como não temos API externa ligada no momento, usamos um mock com ativos conhecidos e dados ilustrativos/realistas.
const MOCK_ASSETS = {
  // BLUE CHIPS / CORE
  'PETR4': { name: 'Petrobras PN', sector: 'Óleo e Gás', price: 38.45, pl: 4.2, dy: 15.4, roe: 32.1 },
  'VALE3': { name: 'Vale ON', sector: 'Mineração', price: 62.10, pl: 6.8, dy: 8.2, roe: 18.5 },
  'ITUB4': { name: 'Itaú Unibanco PN', sector: 'Bancos', price: 34.20, pl: 8.5, dy: 6.5, roe: 21.0 },
  'BBAS3': { name: 'Banco do Brasil ON', sector: 'Bancos', price: 28.50, pl: 4.5, dy: 10.2, roe: 22.4 },
  'B3SA3': { name: 'B3 ON', sector: 'Serviços Financeiros', price: 12.30, pl: 14.2, dy: 5.1, roe: 15.3 },
  // DIVIDENDOS
  'TAEE11': { name: 'Taesa Unit', sector: 'Energia Elétrica', price: 35.80, pl: 9.1, dy: 9.8, roe: 18.2 },
  'EGIE3': { name: 'Engie Brasil ON', sector: 'Energia Elétrica', price: 41.20, pl: 10.5, dy: 7.4, roe: 25.1 },
  'BBSE3': { name: 'BB Seguridade ON', sector: 'Seguros', price: 33.10, pl: 8.8, dy: 11.0, roe: 75.4 },
  'CXSE3': { name: 'Caixa Seguridade', sector: 'Seguros', price: 14.50, pl: 9.2, dy: 9.5, roe: 35.2 },
  'TRPL4': { name: 'Isa Cteep PN', sector: 'Energia Elétrica', price: 25.40, pl: 6.5, dy: 12.1, roe: 16.5 },
  // CRESCIMENTO (SMALL CAPS) / OPORTUNIDADE
  'WEGE3': { name: 'WEG ON', sector: 'Bens Industriais', price: 38.90, pl: 35.2, dy: 1.8, roe: 28.5 },
  'PRIO3': { name: 'Prio ON', sector: 'Óleo e Gás', price: 45.20, pl: 8.5, dy: 0.0, roe: 35.1 },
  'TOTS3': { name: 'Totvs ON', sector: 'Tecnologia', price: 28.40, pl: 25.1, dy: 1.5, roe: 15.2 },
  'VAMO3': { name: 'Vamos ON', sector: 'Locação', price: 8.50, pl: 12.4, dy: 3.2, roe: 14.5 },
  // FIIs
  'MXRF11': { name: 'Maxi Renda FII', sector: 'FII Papel', price: 10.40, pl: 0, dy: 12.5, roe: 0 },
  'HGLG11': { name: 'CSHG Logística FII', sector: 'FII Tijolo', price: 165.20, pl: 0, dy: 8.5, roe: 0 },
  'KNCR11': { name: 'Kinea Rendimentos FII', sector: 'FII Papel', price: 105.10, pl: 0, dy: 11.2, roe: 0 },
  // GLOBAL
  'IVVB11': { name: 'iShares S&P 500 ETF', sector: 'ETF Global', price: 295.40, pl: 0, dy: 0, roe: 0 },
  'NASD11': { name: 'Trend Nasdaq 100 ETF', sector: 'ETF Global', price: 18.20, pl: 0, dy: 0, roe: 0 },
  'AAPL34': { name: 'Apple BDR', sector: 'BDR Tecnologia', price: 42.50, pl: 28.5, dy: 0.5, roe: 155.2 },
  'MSFT34': { name: 'Microsoft BDR', sector: 'BDR Tecnologia', price: 78.40, pl: 35.2, dy: 0.8, roe: 38.5 },
};

const PORTFOLIOS_CONFIG = [
  { id: 'core', name: 'Carteira Core (Blue Chips)', icon: Shield, color: '#3b82f6', desc: 'Foco em estabilidade e empresas gigantes da B3.' },
  { id: 'dividendos', name: 'Carteira de Dividendos', icon: DollarSign, color: '#10b981', desc: 'Foco em geração de renda passiva (DY Alto).' },
  { id: 'crescimento', name: 'Carteira Crescimento', icon: TrendingUp, color: '#8b5cf6', desc: 'Apostas em Small Caps e empresas descontadas.' },
  { id: 'global', name: 'Carteira Global', icon: Globe, color: '#f59e0b', desc: 'Proteção em moeda forte (ETFs, BDRs).' },
  { id: 'oportunidade', name: 'Oportunidade (Swing Trade)', icon: Zap, color: '#ef4444', desc: 'Caixa para trades curtos com Alvo/Stop definidos.' },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];

const Carteiras = () => {
  const [activeTab, setActiveTab] = useState('core');
  
  // Estado local para simular os portfólios do usuário (num app real viria de um DB)
  // Estrutura: { [portfolioId]: [ { ticker, allocationTarget, quantity, avgPrice, type (position/swing), stopLoss, takeProfit } ] }
  const [portfolios, setPortfolios] = useState({
    'core': [
      { ticker: 'PETR4', targetPct: 40, quantity: 500, avgPrice: 35.00 },
      { ticker: 'VALE3', targetPct: 30, quantity: 200, avgPrice: 65.00 },
      { ticker: 'ITUB4', targetPct: 30, quantity: 300, avgPrice: 30.00 },
    ],
    'dividendos': [
      { ticker: 'TAEE11', targetPct: 50, quantity: 1000, avgPrice: 34.00 },
      { ticker: 'BBSE3', targetPct: 50, quantity: 800, avgPrice: 31.00 },
    ],
    'crescimento': [],
    'global': [],
    'oportunidade': []
  });

  // Estado para adicionar novo ativo
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState({ ticker: '', targetPct: 0, quantity: 0, avgPrice: 0 });

  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!newAsset.ticker || newAsset.targetPct <= 0) return;
    
    const ticker = newAsset.ticker.toUpperCase();
    
    setPortfolios(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], { ...newAsset, ticker }]
    }));
    
    setShowAddForm(false);
    setNewAsset({ ticker: '', targetPct: 0, quantity: 0, avgPrice: 0 });
  };

  const removeAsset = (tickerToRemove) => {
    setPortfolios(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(a => a.ticker !== tickerToRemove)
    }));
  };

  // Motor de Cálculos (Dinâmico para a aba ativa)
  const portfolioData = useMemo(() => {
    const assets = portfolios[activeTab] || [];
    
    // 1. Calcular o Patrimônio Total Atual
    const totalValue = assets.reduce((sum, item) => {
      const fund = MOCK_ASSETS[item.ticker] || { price: item.avgPrice || 10 };
      return sum + (item.quantity * fund.price);
    }, 0);

    const enrichedAssets = assets.map(item => {
      const fund = MOCK_ASSETS[item.ticker] || { price: item.avgPrice || 10, name: 'Ativo Desconhecido', pl: 0, dy: 0, roe: 0 };
      const currentPrice = fund.price;
      const positionValue = item.quantity * currentPrice;
      
      const profitPct = item.avgPrice > 0 ? ((currentPrice - item.avgPrice) / item.avgPrice) * 100 : 0;
      
      return {
        ...item,
        currentPrice,
        positionValue,
        profitPct,
        fund
      };
    });

    // 2. Calcular Alocação Atual e Rebalanceamento
    return enrichedAssets.map(item => {
      const currentPct = totalValue > 0 ? (item.positionValue / totalValue) * 100 : 0;
      const diffPct = currentPct - item.targetPct;
      
      // Lógica de Sinal de Rebalanceamento
      let action = 'HOLD';
      let actionColor = 'var(--text-muted)';
      
      // Se a diferença for maior que 5% para baixo, COMPRAR
      if (diffPct < -5) {
        action = 'COMPRAR';
        actionColor = 'var(--success)';
      } 
      // Se a diferença for maior que 5% para cima, VENDER/REALIZAR
      else if (diffPct > 5) {
        action = 'VENDER';
        actionColor = 'var(--danger)';
      }

      return {
        ...item,
        currentPct,
        diffPct,
        action,
        actionColor
      };
    }).sort((a, b) => b.positionValue - a.positionValue);

  }, [portfolios, activeTab]);

  const totalPortfolioValue = portfolioData.reduce((acc, curr) => acc + curr.positionValue, 0);

  // Gráfico de Pizza
  const pieData = portfolioData.map(item => ({
    name: item.ticker,
    value: item.positionValue
  }));

  const activeConfig = PORTFOLIOS_CONFIG.find(c => c.id === activeTab);
  const ActiveIcon = activeConfig?.icon || Briefcase;

  return (
    <div className="home-container animate-fade-in" style={{ paddingBottom: '2rem' }}>
      
      {/* Hero Header */}
      <section className="hero-section" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="hero-bg-glow" style={{ opacity: 0.15, background: 'radial-gradient(circle at 50% 50%, var(--success) 0%, transparent 70%)' }}></div>
        
        <div className="hero-content" style={{ textAlign: 'left', zIndex: 1 }}>
          <h1 className="hero-title" style={{ fontSize: '2rem' }}>
            <Briefcase style={{ marginRight: '10px', verticalAlign: 'middle', display: 'inline-block' }} /> Smart Portfolios (Position/Swing)
          </h1>
          <p className="hero-subtitle" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>
            Gerencie suas carteiras de longo prazo com inteligência de rebalanceamento e fundamentos.
          </p>
        </div>
      </section>

      {/* Navegação das Carteiras */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {PORTFOLIOS_CONFIG.map(config => {
          const Icon = config.icon;
          const isActive = activeTab === config.id;
          return (
            <button
              key={config.id}
              onClick={() => setActiveTab(config.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '1rem 1.5rem',
                background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${isActive ? config.color : 'transparent'}`,
                borderRadius: '12px',
                color: isActive ? 'white' : 'var(--text-muted)',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={18} color={isActive ? config.color : 'currentColor'} />
              {config.name}
            </button>
          )
        })}
      </div>

      {/* Painel da Carteira Ativa */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderTop: `4px solid ${activeConfig.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <ActiveIcon color={activeConfig.color} /> {activeConfig.name}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{activeConfig.desc}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Patrimônio Atual (Estimado)</p>
            <h2 style={{ fontSize: '2rem', color: 'var(--success)', margin: 0 }}>
              R$ {totalPortfolioValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        {/* Layout Dividido: Gráfico e Lista */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          
          {/* Esquerda: Gráfico de Pizza */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChartIcon size={18}/> Alocação Atual
            </h3>
            
            {pieData.length > 0 ? (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Carteira Vazia
              </div>
            )}

            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="action-button primary" 
              style={{ width: '100%', marginTop: 'auto', display: 'flex', justifyContent: 'center' }}
            >
              <Plus size={18} /> Adicionar Ativo
            </button>
          </div>

          {/* Direita: Tabela de Ativos e Fundamentos */}
          <div>
            {/* Form de Adição (Toggle) */}
            {showAddForm && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px dashed var(--border-subtle)' }}>
                <h4 style={{ color: 'white', marginTop: 0, marginBottom: '1rem' }}>Adicionar Ativo à {activeConfig.name}</h4>
                <form onSubmit={handleAddAsset} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ticker (ex: PETR4)</label>
                    <input 
                      type="text" 
                      value={newAsset.ticker}
                      onChange={e => setNewAsset({...newAsset, ticker: e.target.value.toUpperCase()})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', color: 'white' }}
                      placeholder="PETR4"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alvo Desejado (%)</label>
                    <input 
                      type="number" 
                      value={newAsset.targetPct}
                      onChange={e => setNewAsset({...newAsset, targetPct: Number(e.target.value)})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', color: 'white' }}
                      min="1" max="100"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qtd Atual</label>
                    <input 
                      type="number" 
                      value={newAsset.quantity}
                      onChange={e => setNewAsset({...newAsset, quantity: Number(e.target.value)})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', color: 'white' }}
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Preço Médio (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={newAsset.avgPrice}
                      onChange={e => setNewAsset({...newAsset, avgPrice: Number(e.target.value)})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', color: 'white' }}
                      min="0"
                    />
                  </div>
                  <button type="submit" style={{ padding: '0.5rem 1rem', background: activeConfig.color, color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Salvar
                  </button>
                </form>
                {/* Dica de Mock */}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>
                  Ativos com banco de dados mockado para teste: PETR4, VALE3, ITUB4, BBAS3, WEGE3, TAEE11, EGIE3, BBSE3, MXRF11, HGLG11, IVVB11, AAPL34.
                </p>
              </div>
            )}

            {/* Lista de Ativos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {portfolioData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                  Sua {activeConfig.name.toLowerCase()} está vazia. Adicione ativos para começar.
                </div>
              ) : (
                portfolioData.map((item, idx) => (
                  <div key={idx} style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '12px', 
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    borderLeft: `4px solid ${COLORS[idx % COLORS.length]}`
                  }}>
                    {/* Header do Card (Nome, Valor, Lucro) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>{item.ticker}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                          {item.fund.sector || 'Desconhecido'}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>
                          R$ {item.positionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: item.profitPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {item.profitPct >= 0 ? '+' : ''}{item.profitPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Linha de Fundamentos e Ação */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                      {/* Fundamentos (Mock) */}
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cotação</div>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>R$ {item.currentPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>P/L</div>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>{item.fund.pl > 0 ? item.fund.pl.toFixed(1) : '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Div Yield</div>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>{item.fund.dy > 0 ? `${item.fund.dy.toFixed(1)}%` : '-'}</div>
                      </div>
                      
                      {/* Rebalanceamento (Inteligência) */}
                      <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Alocação</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'white' }}>
                          {item.currentPct.toFixed(1)}% <ArrowRight size={10} color="var(--text-muted)"/> {item.targetPct}%
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Sinal de Ação</div>
                        <span style={{ 
                          background: `${item.actionColor}20`, 
                          color: item.actionColor, 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {item.action === 'COMPRAR' && <Plus size={12}/>}
                          {item.action === 'HOLD' && <CheckCircle size={12}/>}
                          {item.action === 'VENDER' && <AlertCircle size={12}/>}
                          {item.action}
                        </span>
                      </div>
                    </div>
                    
                    {/* Botão de Excluir */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => removeAsset(item.ticker)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Remover Ativo
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carteiras;

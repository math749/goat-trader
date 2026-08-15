import { useEffect } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Tearsheet.css';

const Tearsheet = () => {
  const { getMetrics, getGlobalEquityCurve } = useTrades();
  const metrics = getMetrics();
  const equityCurve = getGlobalEquityCurve();

  // Force light mode on body just for this page (if it's not handled by the layout)
  useEffect(() => {
    document.body.style.backgroundColor = 'white';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="tearsheet-wrapper">
      <div className="tearsheet-container">
        
        {/* Navigation - Hidden in print */}
        <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
          <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a1a1a', textDecoration: 'none', fontWeight: '600' }}>
            <ArrowLeft size={20} /> Voltar ao Dashboard
          </Link>
          <button className="ts-print-btn" onClick={handlePrint}>
            <Printer size={20} /> Imprimir / Salvar PDF
          </button>
        </div>

        {/* Header */}
        <div className="ts-header">
          <div className="ts-title">
            <h1>MATILHA FUND</h1>
            <p>Trader Performance Tearsheet</p>
          </div>
          <div className="ts-meta">
            <div><strong>Data de Geração:</strong> {today}</div>
            <div><strong>Estratégia:</strong> Multi-Asset Day Trade</div>
            <div><strong>Ativos Analisados:</strong> Índice, Dólar, Ações</div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="ts-grid">
          <div className="ts-stat-box">
            <div className="ts-stat-label">Total PnL Acumulado</div>
            <div className={`ts-stat-value ${parseFloat(metrics.totalProfit) >= 0 ? 'positive' : 'negative'}`}>
              R$ {metrics.totalProfit}
            </div>
          </div>
          <div className="ts-stat-box">
            <div className="ts-stat-label">Win Rate</div>
            <div className="ts-stat-value">{metrics.winRate}%</div>
          </div>
          <div className="ts-stat-box">
            <div className="ts-stat-label">Profit Factor</div>
            <div className="ts-stat-value">{metrics.profitFactor}</div>
          </div>
          <div className="ts-stat-box">
            <div className="ts-stat-label">Max Drawdown</div>
            <div className="ts-stat-value negative">R$ {metrics.maxDrawdown}</div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="ts-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="ts-stat-box">
            <div className="ts-stat-label">Total de Trades</div>
            <div className="ts-stat-value">{metrics.totalTrades}</div>
          </div>
          <div className="ts-stat-box">
            <div className="ts-stat-label">Payoff (Risco/Retorno)</div>
            <div className="ts-stat-value">{metrics.payoff}</div>
          </div>
          <div className="ts-stat-box">
            <div className="ts-stat-label">Maior Sequência de Gains</div>
            <div className="ts-stat-value positive">{metrics.maxWinningStreak} trades</div>
          </div>
          <div className="ts-stat-box">
            <div className="ts-stat-label">Maior Sequência de Loss</div>
            <div className="ts-stat-value negative">{metrics.maxLosingStreak} trades</div>
          </div>
        </div>

        {/* Equity Curve Chart */}
        <div className="ts-section">
          <div className="ts-section-title">Curva de Capital (Global)</div>
          <div className="ts-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityCurve} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="index" stroke="#666" fontSize={12} tickLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  formatter={(value) => [`R$ ${value}`, 'PnL']}
                  labelFormatter={(label) => `Trade #${label}`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px' }}
                />
                <Line type="monotone" dataKey="profit" stroke="#1a1a1a" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: '3rem', fontSize: '0.8rem', color: '#666', borderTop: '1px solid #e5e5e5', paddingTop: '1rem' }}>
          <p><strong>Aviso de Risco:</strong> Resultados passados não são garantia de rendimentos futuros. Este relatório foi gerado automaticamente pelo sistema Matilha com base nos dados imputados pelo usuário.</p>
        </div>

      </div>
    </div>
  );
};

export default Tearsheet;

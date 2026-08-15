import { useMemo } from 'react';
import { Crosshair, Target, BarChart2, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Clock, Activity } from 'lucide-react';
import { useTrades } from '../contexts/TradeContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = {
  win: '#10b981', // green
  loss: '#ef4444', // red
  compra: '#3b82f6', // blue
  venda: '#8b5cf6', // purple
  winAsset: '#6366f1', // indigo
  wdoAsset: '#f59e0b' // amber
};

const formatCurrencyNum = (numeric) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
};

const RaioX = () => {
  const { trades } = useTrades();

  const stats = useMemo(() => {
    if (!trades || trades.length === 0) return null;

    let wins = 0;
    let losses = 0;
    let sumWins = 0;
    let sumLosses = 0;
    let maxWin = 0;
    let maxLoss = 0;

    let bySide = { Compra: { count: 0, wins: 0, profit: 0 }, Venda: { count: 0, wins: 0, profit: 0 } };
    let byAsset = { WIN: { count: 0, profit: 0 }, WDO: { count: 0, profit: 0 }, Outros: { count: 0, profit: 0 } };
    let byHour = {};

    trades.forEach(trade => {
      // Parse básico da linha
      const ativo = (trade['ativo'] || trade['Ativo'] || '').toUpperCase();
      const assetKey = ativo.startsWith('WIN') ? 'WIN' : (ativo.startsWith('WDO') ? 'WDO' : 'Outros');
      
      const ladoStr = (trade['lado'] || trade['operação'] || trade['operacao'] || trade['Lado'] || '').toUpperCase();
      const lado = (ladoStr.includes('C') || ladoStr === 'COMPRA') ? 'Compra' : 'Venda';
      
      const dataHoraStr = trade['abertura'] || trade['data'] || trade['hora'] || trade['Abertura'] || trade['Data'] || '';
      
      const resultStr = trade['resultado líquido'] || trade['resultado liquido'] || trade['res. operação'] || trade['res operacao'] || trade['resultado'] || trade['Resultado (R$)'] || trade['Resultado Líquido'] || trade['total'] || '0';
      const bruto = parseFloat(String(resultStr).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

      const qtdStr = trade['quantidade'] || trade['qtd'] || trade['qtd compra'] || trade['qtd venda'] || trade['Quantidade'] || '1';
      const numQtd = parseInt(String(qtdStr).replace(/[^\d]/g, '')) || 1;
      
      // Cálculo de custos
      let custoPorPerna = 0;
      if (ativo.startsWith('WIN')) custoPorPerna = 0.25;
      else if (ativo.startsWith('WDO')) custoPorPerna = 1.00;
      else if (ativo.startsWith('BIT')) custoPorPerna = 0.72;
      const custo = custoPorPerna * 2 * numQtd;

      const liquido = bruto - custo;

      // Global Stats
      if (liquido > 0) {
        wins++;
        sumWins += liquido;
        if (liquido > maxWin) maxWin = liquido;
      } else if (liquido < 0) {
        losses++;
        sumLosses += liquido;
        if (liquido < maxLoss) maxLoss = liquido;
      }

      // By Side
      bySide[lado].count++;
      bySide[lado].profit += liquido;
      if (liquido > 0) bySide[lado].wins++;

      // By Asset
      byAsset[assetKey].count++;
      byAsset[assetKey].profit += liquido;

      // By Hour
      // Pega a hora ex: "09:15:00" -> "09h"
      let hourMatch = dataHoraStr.match(/ (\d{2}):/);
      if (!hourMatch) hourMatch = dataHoraStr.match(/(?:^|T)(\d{2}):\d{2}/);
      
      if (hourMatch) {
        const h = hourMatch[1] + 'h';
        if (!byHour[h]) byHour[h] = { hour: h, count: 0, profit: 0, wins: 0 };
        byHour[h].count++;
        byHour[h].profit += liquido;
        if (liquido > 0) byHour[h].wins++;
      }
    });

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgWin = wins > 0 ? sumWins / wins : 0;
    const avgLoss = losses > 0 ? Math.abs(sumLosses / losses) : 0;
    const payoff = avgLoss > 0 ? avgWin / avgLoss : 0;
    const profitFactor = Math.abs(sumLosses) > 0 ? sumWins / Math.abs(sumLosses) : sumWins;

    // Formatar arrays para os gráficos
    const pieSideData = [
      { name: 'Comprado', value: bySide['Compra'].count, profit: bySide['Compra'].profit },
      { name: 'Vendido', value: bySide['Venda'].count, profit: bySide['Venda'].profit }
    ];

    const hourlyData = Object.values(byHour).sort((a, b) => a.hour.localeCompare(b.hour)).map(h => ({
      ...h,
      winRate: (h.wins / h.count) * 100
    }));

    return {
      totalTrades, wins, losses, winRate, avgWin, avgLoss, payoff, profitFactor, maxWin, maxLoss,
      bySide, byAsset, pieSideData, hourlyData
    };
  }, [trades]);

  if (!trades || trades.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h2><Crosshair size={24} color="var(--primary-accent)" /> Raio-X de Performance</h2>
          <p>O que você não mede, você não gerencia.</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Activity size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3>Nenhum dado encontrado</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Faça o upload do seu relatório no Histórico para ver seu Raio-X.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2><Crosshair size={24} color="var(--primary-accent)" /> Raio-X de Performance</h2>
        <p>Entenda onde você ganha mais dinheiro e onde estão os seus vazamentos.</p>
      </div>

      {/* Main KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
            <Target size={24} color="var(--primary-accent)" />
          </div>
          <div className="stat-content">
            <p>Taxa de Acerto (Win Rate)</p>
            <h3>{stats.winRate.toFixed(1)}%</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{stats.wins} Ganhos / {stats.losses} Perdas</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <Activity size={24} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <p>Payoff (Risco/Retorno)</p>
            <h3>{stats.payoff.toFixed(2)}</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Média de Ganho vs Perda</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <ArrowUpRight size={24} color="#10b981" />
          </div>
          <div className="stat-content">
            <p>Média de Ganhos</p>
            <h3 style={{ color: '#10b981' }}>{formatCurrencyNum(stats.avgWin)}</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Maior: {formatCurrencyNum(stats.maxWin)}</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <ArrowDownRight size={24} color="#ef4444" />
          </div>
          <div className="stat-content">
            <p>Média de Perdas</p>
            <h3 style={{ color: '#ef4444' }}>-{formatCurrencyNum(stats.avgLoss)}</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Maior: {formatCurrencyNum(stats.maxLoss)}</span>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem', alignItems: 'stretch' }}>
        
        {/* Lado Operacional */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChartIcon size={20} color="var(--primary-accent)" />
            Perfil Operacional (Compra x Venda)
          </h3>
          <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
            <div style={{ width: '50%', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieSideData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.pieSideData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Comprado' ? COLORS.compra : COLORS.venda} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-main)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS.compra }}></div>
                  <span style={{ fontWeight: 600 }}>Operações na Compra</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total: {stats.bySide['Compra'].count} trades</p>
                <p style={{ fontWeight: 600, color: stats.bySide['Compra'].profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  Resultado: {formatCurrencyNum(stats.bySide['Compra'].profit)}
                </p>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS.venda }}></div>
                  <span style={{ fontWeight: 600 }}>Operações na Venda</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total: {stats.bySide['Venda'].count} trades</p>
                <p style={{ fontWeight: 600, color: stats.bySide['Venda'].profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  Resultado: {formatCurrencyNum(stats.bySide['Venda'].profit)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desempenho por Ativo */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={20} color="var(--primary-accent)" />
            Desempenho por Ativo
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, justifyContent: 'center' }}>
            {['WIN', 'WDO'].map(asset => {
              const data = stats.byAsset[asset];
              if (data.count === 0) return null;
              
              const isProfit = data.profit >= 0;
              return (
                <div key={asset} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.25rem' }}>{asset}</h4>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '99px', 
                      fontSize: '0.85rem', 
                      fontWeight: 600,
                      backgroundColor: isProfit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: isProfit ? '#10b981' : '#ef4444'
                    }}>
                      {formatCurrencyNum(data.profit)}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                    {data.count} operações realizadas neste ativo.
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Gráfico de Desempenho por Hora */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} color="var(--primary-accent)" />
          Resultado Financeiro por Faixa de Horário
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Descubra qual o melhor horário do dia para o seu operacional. Muitas vezes o lucro de um horário paga o loss de outro.
        </p>
        
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.hourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="hour" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
              <YAxis 
                stroke="var(--text-muted)" 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--text-main)' }}
                formatter={(value, name) => {
                  if (name === "profit") return [formatCurrencyNum(value), "Resultado Líquido"];
                  return [value, name];
                }}
              />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {stats.hourlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? COLORS.win : COLORS.loss} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default RaioX;

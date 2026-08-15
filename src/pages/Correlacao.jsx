import { useState, useMemo } from 'react';
import { GitCompare, TrendingUp, Activity, Award, Zap, Shuffle } from 'lucide-react';
import { useTrades } from '../contexts/TradeContext';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart
} from 'recharts';

const Correlacao = () => {
  const { trades } = useTrades();

  // Lista de todos os ativos únicos encontrados no histórico
  const availableAssets = useMemo(() => {
    const assets = new Set();
    trades.forEach(trade => {
      const ativo = (trade['ativo'] || trade['Ativo'] || '').toUpperCase().trim();
      if (ativo) {
        // Pega a raiz principal se tiver letras e numeros soltos, ou apenas pega os primeiros 3 caracteres
        // Para simplificar e pegar coisas como US30, WTI, WINJ24, WDOV24
        // Vamos extrair a "raiz" (letras iniciais antes de números) ou deixar o nome limpo
        const match = ativo.match(/^([A-Z]+)/);
        const root = match ? match[1] : ativo;
        assets.add(root);
      }
    });
    return Array.from(assets).sort();
  }, [trades]);

  // Estados para os ativos selecionados
  const [stateAssetA, setAssetA] = useState('WIN');
  const [stateAssetB, setAssetB] = useState('WDO');

  // Ajusta os selecionados se os defaults não existirem na lista do usuário
  const assetA = availableAssets.includes(stateAssetA) ? stateAssetA : (availableAssets[0] || 'WIN');
  const assetB = availableAssets.includes(stateAssetB) ? stateAssetB : (availableAssets[1] || availableAssets[0] || 'WDO');

  // Processamento dos dados
  const { metricsA, metricsB, chartData, insight } = useMemo(() => {
    // Inicializar métricas base
    const met = {
      A: { name: assetA, wins: 0, losses: 0, grossProfit: 0, grossLoss: 0, netProfit: 0, count: 0 },
      B: { name: assetB, wins: 0, losses: 0, grossProfit: 0, grossLoss: 0, netProfit: 0, count: 0 }
    };

    const dailyPnL = {};
    const sortedTrades = [...trades].reverse(); // Ordem cronológica

    sortedTrades.forEach(trade => {
      const ativoFull = (trade['ativo'] || trade['Ativo'] || '').toUpperCase().trim();
      if (!ativoFull) return;

      const resultStr = trade['resultado líquido'] || trade['resultado'] || trade['Resultado (R$)'] || trade['total'] || '0';
      let numericResult = parseFloat(String(resultStr).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

      const qtdStr = trade['quantidade'] || trade['qtd'] || '1';
      const numQtd = parseInt(String(qtdStr).replace(/[^\d]/g, '')) || 1;
      
      let belongsToA = ativoFull.startsWith(assetA);
      let belongsToB = ativoFull.startsWith(assetB);

      if (belongsToA || belongsToB) {
        // Cálculo de Custos apenas para B3 local conhecidos
        let custo = 0;
        if (ativoFull.startsWith('WIN')) custo = 0.25 * 2 * numQtd;
        else if (ativoFull.startsWith('WDO')) custo = 1.00 * 2 * numQtd;
        numericResult -= custo;

        const targetMet = belongsToA ? met.A : met.B;
        const key = belongsToA ? 'A' : 'B';

        // Atualiza métricas base
        targetMet.count++;
        targetMet.netProfit += numericResult;
        
        if (numericResult > 0) {
          targetMet.wins++;
          targetMet.grossProfit += numericResult;
        } else if (numericResult < 0) {
          targetMet.losses++;
          targetMet.grossLoss += Math.abs(numericResult);
        }

        // Extrai data
        const dataStr = trade['abertura'] || trade['data'] || trade['hora'] || trade['Abertura'] || trade['Data'] || '';
        const dateMatch = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        let dateKey = 'Desconhecida';
        if (dateMatch) {
          dateKey = `${dateMatch[1]}/${dateMatch[2]}`; // DD/MM
        }

        if (!dailyPnL[dateKey]) {
          dailyPnL[dateKey] = { date: dateKey, A: 0, B: 0 };
        }
        dailyPnL[dateKey][key] += numericResult;
      }
    });

    // Calcular KPI finais
    const calcFinal = (data) => ({
      name: data.name,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      payoff: data.grossLoss > 0 
        ? (data.grossProfit / data.wins) / (data.grossLoss / data.losses)
        : (data.grossProfit > 0 ? data.grossProfit / data.wins : 0),
      netProfit: data.netProfit,
      count: data.count
    });

    const metricsA = calcFinal(met.A);
    const metricsB = calcFinal(met.B);

    // Montar chartData (Acumulado)
    const cData = [];
    let accA = 0;
    let accB = 0;
    
    Object.keys(dailyPnL).forEach(key => {
      const day = dailyPnL[key];
      accA += day.A;
      accB += day.B;
      cData.push({
        date: day.date,
        dayA: day.A,
        dayB: day.B,
        accA: accA,
        accB: accB
      });
    });

    // Gerar Insight dinâmico
    let generatedInsight = { title: "Aguardando mais dados...", desc: "Nenhum dos ativos possui dados suficientes para análise.", type: 'neutral' };
    
    if (metricsA.count > 0 && metricsB.count > 0) {
      if (metricsA.netProfit > 0 && metricsB.netProfit < 0) {
        generatedInsight = { 
          title: `Vantagem Clara em ${assetA}`, 
          desc: `Você é altamente lucrativo operando ${assetA} (R$ ${metricsA.netProfit.toFixed(2)}), mas devolve o lucro quando tenta operar ${assetB} (R$ ${metricsB.netProfit.toFixed(2)}).`,
          type: 'a-heavy'
        };
      } else if (metricsB.netProfit > 0 && metricsA.netProfit < 0) {
        generatedInsight = { 
          title: `Vantagem Clara em ${assetB}`, 
          desc: `Seu operacional não está funcionando para o ${assetA} (R$ ${metricsA.netProfit.toFixed(2)}). Você extrai muito mais valor (R$ ${metricsB.netProfit.toFixed(2)}) focando apenas em ${assetB}.`,
          type: 'b-heavy'
        };
      } else if (metricsA.netProfit > 0 && metricsB.netProfit > 0) {
        generatedInsight = { 
          title: "Excelente Diversificação", 
          desc: `Parabéns! Você consegue extrair lucro consistente tanto em ${assetA} quanto em ${assetB}. Seu operacional é maduro em ambos os mercados.`,
          type: 'success'
        };
      } else {
        generatedInsight = { 
          title: "Fase de Ajustes", 
          desc: "Atualmente, ambos os ativos estão com saldo negativo. O ideal é reduzir o tamanho da mão e focar em alinhar a técnica em apenas um deles primeiro.",
          type: 'warning'
        };
      }
    }

    return { metricsA, metricsB, chartData: cData, insight: generatedInsight };
  }, [trades, assetA, assetB]);

  // Cores dinâmicas para os ativos no gráfico
  const colorA = "#3b82f6"; // Azul
  const colorB = "#f59e0b"; // Amarelo

  return (
    <div className="home-container animate-fade-in" style={{ paddingBottom: '2rem' }}>
      
      {/* Hero Header */}
      <section className="hero-section" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="hero-bg-glow" style={{ opacity: 0.2, background: 'radial-gradient(circle at 50% 50%, var(--primary-accent) 0%, transparent 70%)' }}></div>
        
        <div className="hero-content" style={{ textAlign: 'left', zIndex: 1 }}>
          <h1 className="hero-title" style={{ fontSize: '2rem' }}>
            <GitCompare style={{ marginRight: '10px', verticalAlign: 'middle', display: 'inline-block' }} /> Laboratório Multimercado
          </h1>
          <p className="hero-subtitle" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>Compare qualquer par de ativos para encontrar sua verdadeira vantagem estatística.</p>
        </div>

        {/* Seletores de Batalha */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', zIndex: 1, flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.8rem', color: colorA, fontWeight: 'bold', textTransform: 'uppercase' }}>Ativo (Desafiante)</label>
            <select 
              value={assetA} 
              onChange={(e) => setAssetA(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: `1px solid ${colorA}`, color: 'white', outline: 'none', fontWeight: 'bold' }}
            >
              {availableAssets.length > 0 ? availableAssets.map(a => <option key={`A_${a}`} value={a}>{a}</option>) : <option value="WIN">WIN</option>}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}>
            <Shuffle size={16} color="var(--text-muted)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.8rem', color: colorB, fontWeight: 'bold', textTransform: 'uppercase' }}>Ativo (Oponente)</label>
            <select 
              value={assetB} 
              onChange={(e) => setAssetB(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: `1px solid ${colorB}`, color: 'white', outline: 'none', fontWeight: 'bold' }}
            >
              {availableAssets.length > 0 ? availableAssets.map(a => <option key={`B_${a}`} value={a}>{a}</option>) : <option value="WDO">WDO</option>}
            </select>
          </div>

        </div>
      </section>

      {/* Insight Card (IA) */}
      <div className="glass-panel" style={{ 
        padding: '1.5rem', 
        marginBottom: '2rem', 
        borderRadius: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        borderLeft: `4px solid ${
          insight.type === 'a-heavy' ? colorA : 
          insight.type === 'b-heavy' ? colorB : 
          insight.type === 'success' ? 'var(--success)' : 'var(--danger)'
        }`,
        background: 'rgba(0,0,0,0.3)'
      }}>
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <Zap size={32} color={insight.type === 'success' ? 'var(--success)' : 'var(--primary-accent)'} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{insight.title}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{insight.desc}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Card Ativo A */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderTop: `4px solid ${colorA}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)', margin: 0 }}>{assetA}</h3>
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: colorA, borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {metricsA.count} Trades
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Resultado Financeiro</p>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: metricsA.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                R$ {metricsA.netProfit.toFixed(2)}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Taxa de Acerto (Win Rate)</p>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: metricsA.winRate >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                {metricsA.winRate.toFixed(1)}%
              </div>
            </div>
            <div style={{ gridColumn: 'span 2', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Award size={14}/> Payoff (Fator de Lucro)</p>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: metricsA.payoff >= 2 ? 'var(--success)' : metricsA.payoff >= 1 ? 'var(--warning)' : 'var(--danger)' }}>
                {metricsA.payoff.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Card Ativo B */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', borderTop: `4px solid ${colorB}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)', margin: 0 }}>{assetB}</h3>
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: colorB, borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {metricsB.count} Trades
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Resultado Financeiro</p>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: metricsB.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                R$ {metricsB.netProfit.toFixed(2)}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Taxa de Acerto (Win Rate)</p>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: metricsB.winRate >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                {metricsB.winRate.toFixed(1)}%
              </div>
            </div>
            <div style={{ gridColumn: 'span 2', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Award size={14}/> Payoff (Fator de Lucro)</p>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: metricsB.payoff >= 2 ? 'var(--success)' : metricsB.payoff >= 1 ? 'var(--warning)' : 'var(--danger)' }}>
                {metricsB.payoff.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Gráfico de Evolução Cruzada */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="var(--primary-accent)"/> PnL Acumulado: {assetA} vs {assetB}
        </h3>
        
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorA} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colorA} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorB} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colorB} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-muted)" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  fontSize={12}
                  tickFormatter={(val) => `R$ ${val}`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'white' }}
                  itemStyle={{ color: 'white' }}
                  formatter={(value, name) => [`R$ ${value.toFixed(2)}`, name === 'accA' ? `Acumulado ${assetA}` : `Acumulado ${assetB}`]}
                  labelStyle={{ color: 'var(--text-muted)', marginBottom: '8px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} payload={[
                  { value: assetA, type: 'circle', id: 'ID_A', color: colorA },
                  { value: assetB, type: 'circle', id: 'ID_B', color: colorB }
                ]} />
                <Area 
                  type="monotone" 
                  dataKey="accA" 
                  name={assetA}
                  stroke={colorA} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorA)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="accB" 
                  name={assetB} 
                  stroke={colorB} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorB)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem' }}>
            <Activity size={48} opacity={0.3} />
            <p>Nenhum dado de trade encontrado cruzando estes ativos.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Correlacao;

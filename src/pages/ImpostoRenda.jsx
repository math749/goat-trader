import { useState, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { 
  Calculator, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Info,
  Check
} from 'lucide-react';
import './ImpostoRenda.css';

export default function ImpostoRenda() {
  const { trades } = useTrades();

  // Mês Selecionado para Apuração (Default: Julho 2026)
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  
  // Estado para DARFs pagas salvas em localStorage
  const [paidDarfs, setPaidDarfs] = useState(() => {
    try {
      const saved = localStorage.getItem('matilha_paid_darfs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [copied, setCopied] = useState(false);

  // Lista de Meses disponíveis no histórico (Ano 2026)
  const monthOptions = useMemo(() => [
    { value: '2026-07', label: 'Julho / 2026 (Mês Atual)' },
    { value: '2026-06', label: 'Junho / 2026' },
    { value: '2026-05', label: 'Maio / 2026' },
    { value: '2026-04', label: 'Abril / 2026' },
    { value: '2026-03', label: 'Março / 2026' },
    { value: '2026-02', label: 'Fevereiro / 2026' },
    { value: '2026-01', label: 'Janeiro / 2026' },
  ], []);

  // Algoritmo de Apuração Mensal de IR (Day Trade B3)
  const monthCalculations = useMemo(() => {
    // Organiza trades por mês (formato YYYY-MM)
    const monthlyData = {};

    // Inicializa meses de 2026
    monthOptions.forEach(m => {
      monthlyData[m.value] = {
        monthKey: m.value,
        label: m.label,
        dayTradeGross: 0,
        swingTradeGross: 0,
        positiveDaysProfit: 0,
        tradesCount: 0
      };
    });

    // Processa os trades da plataforma
    trades.forEach(t => {
      const dateStr = t.date || t.data || new Date().toISOString().split('T')[0];
      const monthKey = dateStr.substring(0, 7);
      
      const profit = parseFloat(t.profit || t.resultado || t.pnl || 0);
      const isSwing = t.type === 'SWING' || t.tipo === 'SWING';

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          monthKey,
          label: monthKey,
          dayTradeGross: 0,
          swingTradeGross: 0,
          positiveDaysProfit: 0,
          tradesCount: 0
        };
      }

      const item = monthlyData[monthKey];
      item.tradesCount += 1;

      if (isSwing) {
        item.swingTradeGross += profit;
      } else {
        item.dayTradeGross += profit;
        if (profit > 0) {
          item.positiveDaysProfit += profit;
        }
      }
    });

    // Ordenar cronologicamente do mês mais antigo ao mais recente para carregar prejuízos acumulados
    const sortedKeys = Object.keys(monthlyData).sort();

    let accumLossDayTrade = 0; // Prejuízo acumulado de Day Trade
    const results = {};

    sortedKeys.forEach(mKey => {
      const data = monthlyData[mKey];
      const dtGross = data.dayTradeGross;

      let lossBroughtForward = accumLossDayTrade; // Prejuízo trazido do mês anterior
      let taxableBase;
      let lossCarriedForward; // Prejuízo a levar para o mês seguinte

      if (dtGross > 0) {
        if (dtGross >= lossBroughtForward) {
          taxableBase = dtGross - lossBroughtForward;
          lossCarriedForward = 0;
        } else {
          taxableBase = 0;
          lossCarriedForward = lossBroughtForward - dtGross;
        }
      } else {
        taxableBase = 0;
        lossCarriedForward = lossBroughtForward + Math.abs(dtGross);
      }

      // Imposto bruto (20% sobre a base tributável do Day Trade)
      const rawTax = taxableBase * 0.20;

      // IRRF Dedo-Duro (1% sobre o resultado dos dias vencedores de Day Trade)
      const irrf = data.positiveDaysProfit * 0.01;

      // Imposto líquido devido (após deduzir o IRRF já retido na corretora)
      let darfAmount = Math.max(0, rawTax - irrf);

      // Regra dos R$ 10,00 da Receita Federal
      const isExemptMinLimit = darfAmount > 0 && darfAmount < 10.0;
      if (isExemptMinLimit) {
        darfAmount = 0; // Acumula se < R$ 10
      }

      // Vencimento da DARF: Último dia útil do mês subsequente
      const [year, month] = mKey.split('-').map(Number);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      // Pega o último dia do mês seguinte
      const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();
      const dueDateStr = `${String(lastDayOfNextMonth).padStart(2, '0')}/${String(nextMonth).padStart(2, '0')}/${nextYear}`;

      results[mKey] = {
        ...data,
        lossBroughtForward,
        taxableBase,
        lossCarriedForward,
        rawTax,
        irrf,
        darfAmount: Math.round(darfAmount * 100) / 100,
        dueDateStr,
        isExemptMinLimit,
        isPaid: !!paidDarfs[mKey]
      };

      // Atualiza o saldo acumulado para o próximo ciclo
      accumLossDayTrade = lossCarriedForward;
    });

    return results;
  }, [trades, paidDarfs, monthOptions]);

  // Apuração do Mês Selecionado
  const currentApuration = monthCalculations[selectedMonth] || {
    dayTradeGross: 0,
    swingTradeGross: 0,
    lossBroughtForward: 0,
    taxableBase: 0,
    lossCarriedForward: 0,
    irrf: 0,
    darfAmount: 0,
    dueDateStr: '31/08/2026',
    isPaid: false
  };

  // Toggle de DARF Paga
  const togglePaidDarf = (monthKey) => {
    const updated = { ...paidDarfs, [monthKey]: !paidDarfs[monthKey] };
    setPaidDarfs(updated);
    try {
      localStorage.setItem('matilha_paid_darfs', JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar estado da DARF:', e);
    }
  };

  // Copia dados da DARF para o Clipboard
  const handleCopyDarfData = () => {
    const darfText = `DARF IRPF B3 (CÓDIGO 6015)
Período de Apuração: ${selectedMonth}
Vencimento: ${currentApuration.dueDateStr}
Valor a Pagar: R$ ${currentApuration.darfAmount.toFixed(2).replace('.', ',')}
Código de Receita: 6015 - IRPF Ganhos em Bolsa (Day Trade)`;

    navigator.clipboard.writeText(darfText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Formatação de Moeda
  const fmt = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="ir-container">
      
      {/* Header Principal */}
      <div className="ir-header">
        <div className="ir-title-group">
          <h1>
            <Calculator color="#818cf8" size={32} />
            Calculadora de IR & DARF (B3)
          </h1>
          <p>Apuração automática de Imposto de Renda para Day Trade (20%) com compensação de prejuízos e emissão de DARF.</p>
        </div>

        {/* Seletor de Mês */}
        <div className="ir-month-selector">
          <Calendar size={18} color="#818cf8" />
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Card em Destaque: Guia DARF Pronta */}
      <div className="darf-highlight-card">
        <div className="darf-info-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {currentApuration.isPaid ? (
              <span className="darf-badge paid"><CheckCircle2 size={14} /> DARF PAGA</span>
            ) : currentApuration.darfAmount > 0 ? (
              <span className="darf-badge pending"><AlertCircle size={14} /> DARF PENDENTE</span>
            ) : (
              <span className="darf-badge exempt"><ShieldCheck size={14} /> SEM IMPOSTO DEVIDO (ISENTO / PREJUÍZO)</span>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Código 6015 · IRPF Bolsa</span>
          </div>

          <div style={{ margin: '0.5rem 0' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block' }}>VALOR DA DARF A PAGAR</span>
            <div className="darf-amount-huge" style={{ color: currentApuration.darfAmount > 0 ? '#f59e0b' : '#10b981' }}>
              {fmt(currentApuration.darfAmount)}
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
            {currentApuration.darfAmount > 0 ? (
              `💡 Guia referente ao lucro líquido apurado em ${selectedMonth}. Vencimento oficial em ${currentApuration.dueDateStr}.`
            ) : currentApuration.lossCarriedForward > 0 ? (
              `🛡️ Você possui ${fmt(currentApuration.lossCarriedForward)} em prejuízos acumulados para abater de lucros futuros.`
            ) : (
              '✅ Nenhum imposto a recolher neste mês.'
            )}
          </p>
        </div>

        {/* Box de Ações e Dados Oficiais */}
        <div className="darf-actions-box">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="darf-field-row">
              <span>Código Receita:</span>
              <strong>6015 (Day Trade B3)</strong>
            </div>
            <div className="darf-field-row">
              <span>Período Apuração:</span>
              <strong>{selectedMonth}</strong>
            </div>
            <div className="darf-field-row">
              <span>Vencimento Oficial:</span>
              <strong>{currentApuration.dueDateStr}</strong>
            </div>
            <div className="darf-field-row">
              <span>Dedução IRRF Retido:</span>
              <strong style={{ color: '#10b981' }}>- {fmt(currentApuration.irrf)}</strong>
            </div>
          </div>

          <div className="darf-btn-group">
            {currentApuration.darfAmount > 0 && (
              <button className="btn-darf-primary" onClick={handleCopyDarfData}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Dados DARF'}
              </button>
            )}
            
            <button 
              className="btn-darf-secondary"
              onClick={() => togglePaidDarf(selectedMonth)}
              style={{ backgroundColor: currentApuration.isPaid ? 'rgba(16,185,129,0.2)' : undefined }}
            >
              <CheckCircle2 size={16} color={currentApuration.isPaid ? '#10b981' : undefined} />
              {currentApuration.isPaid ? 'Marcar como Pendente' : 'Marcar como PAGA'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Detalhamento dos Cálculos do Mês */}
      <div className="ir-grid">
        
        {/* Resultado Bruto Day Trade */}
        <div className="ir-card" style={{ borderLeft: `4px solid ${currentApuration.dayTradeGross >= 0 ? '#10b981' : '#ef4444'}` }}>
          <span className="ir-card-label">Resultado Bruto Day Trade</span>
          <div className="ir-card-value" style={{ color: currentApuration.dayTradeGross >= 0 ? '#10b981' : '#ef4444' }}>
            {fmt(currentApuration.dayTradeGross)}
          </div>
          <span className="ir-card-sub">{currentApuration.tradesCount} operações no mês</span>
        </div>

        {/* Prejuízo Anterior Abatido */}
        <div className="ir-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <span className="ir-card-label">Prejuízo Anterior Abatido</span>
          <div className="ir-card-value" style={{ color: '#60a5fa' }}>
            {fmt(currentApuration.lossBroughtForward)}
          </div>
          <span className="ir-card-sub">Abatimento automático de meses passados</span>
        </div>

        {/* Base de Cálculo (Lucro Tributável) */}
        <div className="ir-card" style={{ borderLeft: '4px solid #818cf8' }}>
          <span className="ir-card-label">Base de Cálculo Tributável</span>
          <div className="ir-card-value">
            {fmt(currentApuration.taxableBase)}
          </div>
          <span className="ir-card-sub">Lucro após compensar prejuízos</span>
        </div>

        {/* Saldo de Prejuízo Acumulado Atual */}
        <div className="ir-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span className="ir-card-label">Prejuízo Acumulado Futuro</span>
          <div className="ir-card-value" style={{ color: '#fbbf24' }}>
            {fmt(currentApuration.lossCarriedForward)}
          </div>
          <span className="ir-card-sub">Saldo disponível para os próximos meses</span>
        </div>

      </div>

      {/* Tabela de Apuração Histórica Mês a Mês */}
      <div className="ir-table-container">
        <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="#818cf8" />
          Histórico de Apuração Tributária (2026)
        </h3>

        <table className="ir-table">
          <thead>
            <tr>
              <th>Mês / Ano</th>
              <th>Resultado Day Trade</th>
              <th>Prejuízo Anterior</th>
              <th>Base Tributável</th>
              <th>IRRF Dedo-Duro</th>
              <th>DARF Devida (R$)</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {monthOptions.map(m => {
              const item = monthCalculations[m.value] || {};
              return (
                <tr key={m.value} style={{ backgroundColor: m.value === selectedMonth ? 'rgba(99, 102, 241, 0.08)' : undefined }}>
                  <td><strong>{m.value}</strong></td>
                  <td style={{ color: item.dayTradeGross >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    {fmt(item.dayTradeGross)}
                  </td>
                  <td>{fmt(item.lossBroughtForward)}</td>
                  <td>{fmt(item.taxableBase)}</td>
                  <td style={{ color: '#10b981' }}>{fmt(item.irrf)}</td>
                  <td style={{ fontWeight: 'bold', color: item.darfAmount > 0 ? '#f59e0b' : '#e2e8f0' }}>
                    {fmt(item.darfAmount)}
                  </td>
                  <td>{item.dueDateStr}</td>
                  <td>
                    {item.isPaid ? (
                      <span className="status-badge pago">PAGO</span>
                    ) : item.darfAmount > 0 ? (
                      <span className="status-badge pendente">PENDENTE</span>
                    ) : item.lossCarriedForward > 0 ? (
                      <span className="status-badge prejuizo">PREJUÍZO</span>
                    ) : (
                      <span className="status-badge isento">ISENTO</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedMonth(m.value)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dicas e Leis Tributárias de Day Trade no Brasil */}
      <div className="ir-tips-grid">
        <div className="ir-tip-card">
          <div className="ir-tip-icon">
            <Info size={20} />
          </div>
          <div className="ir-tip-content">
            <h4>Alíquota Day Trade (20%)</h4>
            <p>Diferente do Swing Trade, no Day Trade não existe a isenção dos R$ 20 mil. Qualquer lucro obtido em operações iniciadas e encerradas no mesmo dia é tributado a 20%.</p>
          </div>
        </div>

        <div className="ir-tip-card">
          <div className="ir-tip-icon">
            <ShieldCheck size={20} />
          </div>
          <div className="ir-tip-content">
            <h4>Compensação de Prejuízos</h4>
            <p>Se você fechar um mês no negativo, esse prejuízo pode ser abatido dos lucros dos meses seguintes por tempo indeterminado, desde que declarado no IRPF Anual.</p>
          </div>
        </div>

        <div className="ir-tip-card">
          <div className="ir-tip-icon">
            <DollarSign size={20} />
          </div>
          <div className="ir-tip-content">
            <h4>IRRF Dedo-Duro (1%)</h4>
            <p>A corretora retém 1% sobre o rendimento positivo de cada dia de Day Trade. O valor total retido no mês deve ser subtraído da sua DARF final para evitar pagar duas vezes.</p>
          </div>
        </div>
      </div>

    </div>
  );
}

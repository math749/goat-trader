import { useState, useMemo } from 'react';
import { Award, ShieldAlert, CheckCircle2, AlertTriangle, TrendingUp, Activity, Shield, FileText, X, Lock, Unlock, UploadCloud, Trash2, Plus, Calculator, Sparkles } from 'lucide-react';
import { useTrades } from '../contexts/TradeContext';
import AnimatedCounter from '../components/AnimatedCounter';
import VisualImportModal from '../components/VisualImportModal';
import './MesaProprietaria.css';

// Presets Oficiais MIDE PROP (Termos e Regulamento de Contrato do Plano Exame)
const PROP_PRESETS = {
  'MIDE_EXAME_CONSERVADOR': {
    name: 'MIDE PROP — Plano Conservador (Oficial)',
    initialCapital: 25000,
    targetProfit: 1400,
    maxDrawdown: 2100,
    dailyDrawdown: 0,
    maxContracts: 10,
    minDays: 5,
    maxConsistencyPct: 50,
    currency: 'R$'
  },
  'MIDE_EXAME_ARROJADO': {
    name: 'MIDE PROP — Plano Arrojado (Oficial)',
    initialCapital: 50000,
    targetProfit: 2400,
    maxDrawdown: 3300,
    dailyDrawdown: 0,
    maxContracts: 20,
    minDays: 5,
    maxConsistencyPct: 50,
    currency: 'R$'
  },
  'MIDE_EXAME_AGRESSIVO': {
    name: 'MIDE PROP — Plano Agressivo (Oficial)',
    initialCapital: 100000,
    targetProfit: 5000,
    maxDrawdown: 6200,
    dailyDrawdown: 0,
    maxContracts: 30,
    minDays: 5,
    maxConsistencyPct: 50,
    currency: 'R$'
  },
  'MIDE_EXAME_MIDE_PLUS': {
    name: 'MIDE PROP — Plano Mide Plus (Oficial)',
    initialCapital: 150000,
    targetProfit: 10500,
    maxDrawdown: 12700,
    dailyDrawdown: 0,
    maxContracts: 40,
    minDays: 5,
    maxConsistencyPct: 50,
    currency: 'R$'
  },
  'CUSTOM': {
    name: 'Mesa Personalizada',
    initialCapital: 2100,
    targetProfit: 1400,
    maxDrawdown: 2100,
    dailyDrawdown: 525,
    dailyDrawdownSR: 525,
    maxContracts: 10,
    minDays: 5,
    maxConsistencyPct: 50,
    currency: 'R$',
    repassePct: 80,
    repasseWeClubPct: 100,
    hasDailyStop: false,
    hasNoTimeLimit: true,
    minTargetSRTransition: 210,
    maxWithdrawMultiplier: 3
  }
};

const MesaProprietaria = () => {
  const { trades, addTradesBulk, clearTrades } = useTrades();

  const [selectedPresetKey, setSelectedPresetKey] = useState('MIDE_EXAME_CONSERVADOR');
  const [showContractModal, setShowContractModal] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [importMessage, setImportMessage] = useState('');

  // Estado da Calculadora de Repasses MIDE
  const [isWeClubMember, setIsWeClubMember] = useState(true);
  const [simulatedProfitInput, setSimulatedProfitInput] = useState('');
  const [includeSrBonus, setIncludeSrBonus] = useState(true);
  
  const preset = PROP_PRESETS[selectedPresetKey];

  // Configurações editáveis
  const [initialCapital, setInitialCapital] = useState(preset.initialCapital);
  const [targetProfit, setTargetProfit] = useState(preset.targetProfit);
  const [maxDrawdown, setMaxDrawdown] = useState(preset.maxDrawdown);
  const [dailyDrawdown, setDailyDrawdown] = useState(preset.dailyDrawdown);
  const [maxContracts, setMaxContracts] = useState(preset.maxContracts);
  const [minDays, setMinDays] = useState(preset.minDays);
  const [maxConsistencyPct, setMaxConsistencyPct] = useState(preset.maxConsistencyPct);
  const [currency, setCurrency] = useState(preset.currency);

  const handleSelectPreset = (key) => {
    setSelectedPresetKey(key);
    const p = PROP_PRESETS[key];
    setInitialCapital(p.initialCapital);
    setTargetProfit(p.targetProfit);
    setMaxDrawdown(p.maxDrawdown);
    setDailyDrawdown(p.dailyDrawdown);
    setMaxContracts(p.maxContracts);
    setMinDays(p.minDays);
    setMaxConsistencyPct(p.maxConsistencyPct);
    setCurrency(p.currency);
  };

  const handleQuickTextImport = () => {
    if (!pastedText.trim()) return;
    
    const lines = pastedText.split('\n').filter(l => l.trim().length > 0);
    const parsedTrades = [];

    lines.forEach((line) => {
      const parts = line.split(/[\t;,|]+/);
      if (parts.length >= 2) {
        const assetPart = parts.find(p => /WIN|WDO|BIT|PETR|VALE|IND|DOL/i.test(p)) || 'WIN';
        const datePart = parts.find(p => /\d{2}\/\d{2}\/\d{4}/.test(p)) || new Date().toLocaleDateString('pt-BR');
        const timePart = parts.find(p => /\d{2}:\d{2}/.test(p)) || '10:00:00';
        const resultPart = parts.find(p => /R\$|-?\d+[.,]\d{2}/.test(p) && !p.includes('/')) || '0';
        const sidePart = line.toLowerCase().includes('venda') ? 'Venda' : 'Compra';
        const qtdPart = parts.find(p => /^\d{1,3}$/.test(p.trim())) || '1';

        parsedTrades.push({
          'Ativo': assetPart.trim().toUpperCase(),
          'Data': `${datePart.trim()} ${timePart.trim()}`,
          'Abertura': `${datePart.trim()} ${timePart.trim()}`,
          'Lado': sidePart,
          'Resultado (R$)': resultPart.trim(),
          'resultado líquido': resultPart.trim(),
          'quantidade': qtdPart.trim()
        });
      }
    });

    if (parsedTrades.length > 0) {
      const res = addTradesBulk(parsedTrades);
      setImportMessage(`✅ ${res.added} operações do Profit importadas com sucesso! (${res.skipped} duplicadas ignoradas).`);
      setPastedText('');
    } else {
      setImportMessage('⚠️ Nenhuma operação válida identificada. Cole as linhas do relatório do ProfitChart.');
    }
  };

  // Auxiliar para normalizar qualquer objeto de trade (ProfitChart / CSV / manual)
  const parseTradeItem = (tr) => {
    const rawDateStr = tr['abertura'] || tr['data'] || tr['Abertura'] || tr['Data'] || tr['date'] || tr['hora'] || tr['Hora'] || '';
    let dateKey = 'OUTROS';
    
    const dMatch = String(rawDateStr).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dMatch) {
      dateKey = `${dMatch[3]}-${dMatch[2]}-${dMatch[1]}`;
    } else {
      const isoMatch = String(rawDateStr).match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        dateKey = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      }
    }

    const resultStr = tr['resultado líquido'] || tr['resultado liquido'] || tr['res. operação'] || tr['res operacao'] || tr['resultado'] || tr['Resultado (R$)'] || tr['resultado (r$)'] || tr['total'] || tr['Total'] || '0';
    const rawPnl = typeof tr.pnl === 'number' ? tr.pnl : (parseFloat(String(resultStr).replace(/[^\d,-]/g, '').replace(',', '.')) || 0);

    const asset = (tr['ativo'] || tr['Ativo'] || tr.asset || 'WIN').toUpperCase();

    const qtdStr = tr['quantidade'] || tr['qtd'] || tr['qtd compra'] || tr['qtd venda'] || tr['Quantidade'] || tr.contracts || '1';
    const numQtd = parseInt(String(qtdStr).replace(/[^\d]/g, ''), 10) || 1;

    let custoPorPerna = 0;
    if (asset.startsWith('WIN')) custoPorPerna = 0.25;
    else if (asset.startsWith('WDO')) custoPorPerna = 1.00;
    else if (asset.startsWith('BIT')) custoPorPerna = 0.72;

    const netPnl = rawPnl - (custoPorPerna * 2 * numQtd);

    const sideRaw = tr['lado'] || tr['Lado'] || tr['operação'] || tr['operacao'] || tr.side || 'COMPRA';
    const isVenda = String(sideRaw).toUpperCase().includes('V');

    return {
      rawDateStr: rawDateStr || new Date().toLocaleDateString('pt-BR'),
      dateKey,
      asset,
      rawPnl,
      netPnl,
      quantity: numQtd,
      side: isVenda ? 'VENDA' : 'COMPRA'
    };
  };

  // Cálculos do Progresso da Mesa Proprietária
  const propStats = useMemo(() => {
    const normalizedTrades = (trades || []).map(parseTradeItem);
    
    let totalPnl = 0;
    const dailyMap = {};

    normalizedTrades.forEach(tr => {
      totalPnl += tr.netPnl;
      dailyMap[tr.dateKey] = (dailyMap[tr.dateKey] || 0) + tr.netPnl;
    });

    const currentAccountValue = initialCapital + totalPnl;
    
    // Percentual da Meta Concluída
    const profitProgressPct = Math.min(100, Math.max(0, (totalPnl / targetProfit) * 100));

    const dailyPnls = Object.values(dailyMap);
    const validDays = Object.keys(dailyMap).filter(k => k !== 'OUTROS');
    const daysTraded = validDays.length > 0 ? validDays.length : (normalizedTrades.length > 0 ? 1 : 0);
    const daysProgressPct = Math.min(100, (daysTraded / Math.max(1, minDays)) * 100);

    // Maior dia de lucro para regra de consistência
    const positiveDays = dailyPnls.filter(pnl => pnl > 0);
    const maxWinningDayPnL = positiveDays.length > 0 ? Math.max(...positiveDays) : 0;
    const consistencyPct = totalPnl > 0 ? ((maxWinningDayPnL / totalPnl) * 100) : 0;
    const isConsistencyViolated = consistencyPct > maxConsistencyPct;

    // Cálculo do PnL do Dia Atual
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPnL = dailyMap[todayStr] || (dailyPnls.length > 0 ? dailyPnls[dailyPnls.length - 1] : 0);
    const isDailyLossViolated = dailyDrawdown > 0 && todayPnL < -dailyDrawdown;

    // Trailing Drawdown Threshold & Buffer
    let peakCapital = initialCapital;
    let accumulated = initialCapital;
    normalizedTrades.forEach(tr => {
      accumulated += tr.netPnl;
      if (accumulated > peakCapital) peakCapital = accumulated;
    });

    const trailingStopLevel = peakCapital - maxDrawdown;
    const drawdownBuffer = currentAccountValue - trailingStopLevel; // Quanto dinheiro pode perder até ser reprovado
    const isFailedDrawdown = currentAccountValue <= trailingStopLevel;

    // Status da Conta
    let accountStatus = 'IN_PROGRESS';
    let statusMessage = 'Conta ativa. Siga o plano de gerenciamento com disciplina!';

    if (isFailedDrawdown) {
      accountStatus = 'FAILED';
      statusMessage = 'REPROVADO: Limite máximo de Trailing Drawdown violado!';
    } else if (isDailyLossViolated) {
      accountStatus = 'FAILED';
      statusMessage = 'REPROVADO: Limite de perda diária violado hoje!';
    } else if (totalPnl >= targetProfit && daysTraded >= minDays && !isConsistencyViolated) {
      accountStatus = 'PASSED';
      statusMessage = '🎉 APROVADO! Parabéns, você concluiu todos os requisitos da mesa!';
    } else if (isConsistencyViolated) {
      accountStatus = 'WARNING';
      statusMessage = `Atenção: Seu maior dia representa ${consistencyPct.toFixed(1)}% do lucro total (limite da mesa: ${maxConsistencyPct}%). Faça mais trades para diluir!`;
    }

    const remainingProfit = Math.max(0, targetProfit - totalPnl);
    const remainingDays = Math.max(1, minDays - daysTraded);
    const recommendedDailyTarget = remainingProfit > 0 ? Math.ceil(remainingProfit / remainingDays) : 0;

    return {
      totalPnl,
      currentAccountValue,
      profitProgressPct,
      daysTraded,
      daysProgressPct,
      maxWinningDayPnL,
      consistencyPct,
      isConsistencyViolated,
      todayPnL,
      isDailyLossViolated,
      peakCapital,
      trailingStopLevel,
      drawdownBuffer,
      isFailedDrawdown,
      accountStatus,
      statusMessage,
      remainingProfit,
      remainingDays,
      recommendedDailyTarget,
      normalizedTrades
    };
  }, [trades, initialCapital, targetProfit, minDays, maxConsistencyPct, dailyDrawdown, maxDrawdown]);

  // Cálculos da Calculadora de Repasses MIDE
  const payoutCalc = useMemo(() => {
    const rawProfitInput = parseFloat(simulatedProfitInput);
    const profitToUse = !isNaN(rawProfitInput) && rawProfitInput >= 0 ? rawProfitInput : (propStats.totalPnl > 0 ? propStats.totalPnl : targetProfit);

    const irTax = profitToUse * 0.20; // 20% de Imposto de Renda Obrigatório
    const profitAfterIr = profitToUse - irTax;
    const splitRate = isWeClubMember ? 1.0 : 0.80; // 100% WeClub vs 80% Padrão
    const traderShare = profitAfterIr * splitRate;

    // Bônus do Take do SR (Pago em 3 parcelas iguais)
    const srBonusPortion = includeSrBonus ? (targetProfit / 3) : 0;
    
    const grossTotalNet = traderShare + srBonusPortion;

    // Teto de saque por ciclo conforme o contrato MIDE
    let payoutCap = maxDrawdown * 2;
    if (selectedPresetKey === 'MIDE_EXAME_CONSERVADOR') payoutCap = maxDrawdown * 3; // R$ 6.300
    else if (selectedPresetKey === 'MIDE_EXAME_ARROJADO') payoutCap = maxDrawdown * 2.5; // R$ 8.250
    else if (selectedPresetKey === 'MIDE_EXAME_AGRESSIVO') payoutCap = maxDrawdown * 2; // R$ 12.400
    else if (selectedPresetKey === 'MIDE_EXAME_MIDE_PLUS') payoutCap = maxDrawdown * 2; // R$ 25.400

    const isCapped = grossTotalNet > payoutCap;
    const finalPayout = isCapped ? payoutCap : grossTotalNet;

    return {
      profitToUse,
      irTax,
      profitAfterIr,
      splitRatePct: splitRate * 100,
      traderShare,
      srBonusPortion,
      grossTotalNet,
      payoutCap,
      isCapped,
      finalPayout
    };
  }, [simulatedProfitInput, propStats.totalPnl, targetProfit, isWeClubMember, includeSrBonus, maxDrawdown, selectedPresetKey]);

  return (
    <div className="home-container animate-fade-in prop-container">
      
      {/* Hero Header */}
      <section className="prop-hero">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Award size={32} color="#38bdf8" />
            <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 800 }}>MIDE PROP — Gestão de Exames & Planos</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
            Cockpit oficial de gerenciamento para exames (Avaliação R$25k, R$50k, R$100k) e Simulador Remunerado Veloz 2.0 no ProfitChart.
          </p>
        </div>

        {/* Action Buttons & Badge Status da Conta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="tactic-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <UploadCloud size={16} /> Importar Operações do Profit
          </button>

          <button 
            onClick={() => setShowContractModal(true)}
            className="tactic-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <FileText size={16} /> Ver Contrato MIDE
          </button>

          <div className={`prop-badge ${propStats.accountStatus.toLowerCase()}`}>
            {propStats.accountStatus === 'PASSED' && <CheckCircle2 size={16} />}
            {propStats.accountStatus === 'IN_PROGRESS' && <Activity size={16} />}
            {(propStats.accountStatus === 'FAILED' || propStats.accountStatus === 'WARNING') && <AlertTriangle size={16} />}
            
            {propStats.accountStatus === 'PASSED' && 'APROVADO NA MESA'}
            {propStats.accountStatus === 'IN_PROGRESS' && 'EM PROGRESSO'}
            {propStats.accountStatus === 'WARNING' && 'ATENÇÃO À CONSISTÊNCIA'}
            {propStats.accountStatus === 'FAILED' && 'TESTE REPROVADO'}
          </div>
        </div>
      </section>

      {/* Seção Integrada: Importador Rápido do Profit (Nelogica) */}
      <div className="prop-card" style={{ marginBottom: '2rem', background: 'rgba(16, 185, 129, 0.04)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
              <UploadCloud size={20} /> Alimentar Cockpit com Operações do ProfitChart
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Carregue o arquivo CSV exportado do ProfitChart ou cole o texto do relatório para atualizar o progresso da mesa instantaneamente.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong>{trades.length}</strong> operações gravadas
            </span>
            {trades.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Deseja realmente limpar todas as operações salvas no cockpit?')) {
                    clearTrades();
                    setImportMessage('🗑️ Todas as operações foram removidas.');
                  }
                }}
                style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Trash2 size={14} /> Limpar trades
              </button>
            )}
          </div>
        </div>

        {/* Form Rápido de Colar Texto do Profit & Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Cole aqui o texto copiado do Relatório de Performance ou Lista de Ordens do ProfitChart..."
            rows={3}
            className="tactic-input"
            style={{ fontSize: '0.85rem', fontFamily: 'monospace', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleQuickTextImport}
              className="tactic-btn"
              style={{ background: '#34d399', color: '#0f172a', fontWeight: 700, padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> Processar Texto Colado
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="tactic-btn"
              style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600, padding: '0.55rem 1.25rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <UploadCloud size={16} /> Carregar Arquivo CSV do Profit
            </button>

            {importMessage && (
              <span style={{ fontSize: '0.8rem', color: importMessage.includes('✅') ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                {importMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stepper de Evolução MIDE PROP: Exame ➔ Simulador Remunerado ➔ Conta Real */}
      <div className="prop-card" style={{ marginBottom: '2rem', background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(15, 23, 42, 0.4) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color="#38bdf8" /> Jornada de Aprovação: {preset.name}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Regra dos 50%: Máx <strong>{currency} {(targetProfit * 0.5).toLocaleString('pt-BR')} / dia</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', position: 'relative' }}>
          
          {/* FASE 1: EXAME / AVALIAÇÃO */}
          <div style={{
            background: propStats.totalPnl >= targetProfit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.08)',
            border: `1px solid ${propStats.totalPnl >= targetProfit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
            padding: '1.25rem',
            borderRadius: '14px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: propStats.totalPnl >= targetProfit ? '#34d399' : '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                FASE 1: EXAME (AVALIAÇÃO)
              </span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: propStats.totalPnl >= targetProfit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)', color: propStats.totalPnl >= targetProfit ? '#34d399' : '#38bdf8', fontWeight: 700 }}>
                {propStats.totalPnl >= targetProfit ? '✅ CONCLUÍDO' : 'EM ANDAMENTO'}
              </span>
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }} className="prop-metric-value">
              Take Exame: {currency} {targetProfit.toLocaleString('pt-BR')}
            </div>

            <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', paddingLeft: '1rem' }}>
              <li>Limite Perda Total: <strong>{currency} {maxDrawdown.toLocaleString('pt-BR')}</strong></li>
              <li>Stop Loss Diário: <strong>Sem Stop Diário</strong></li>
              <li>Lote Máximo: <strong>Até {maxContracts} Contratos (WIN/WDO)</strong></li>
              <li>Pregões Mínimos: <strong>{minDays} Pregões Operados</strong></li>
              <li>Regra 50%: <strong>Máx {currency} {(targetProfit * 0.5).toLocaleString('pt-BR')} / dia</strong></li>
            </ul>
          </div>

          {/* FASE 2: SIMULADOR REMUNERADO */}
          <div style={{
            background: propStats.totalPnl >= targetProfit ? (propStats.totalPnl >= targetProfit * 2 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(251, 191, 36, 0.08)') : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${propStats.totalPnl >= targetProfit ? (propStats.totalPnl >= targetProfit * 2 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 191, 36, 0.3)') : 'rgba(255, 255, 255, 0.08)'}`,
            padding: '1.25rem',
            borderRadius: '14px',
            opacity: propStats.totalPnl >= targetProfit ? 1 : 0.6
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: propStats.totalPnl >= targetProfit ? '#fbbf24' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                FASE 2: SIMULADOR REMUNERADO
              </span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: propStats.totalPnl >= targetProfit ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: propStats.totalPnl >= targetProfit ? '#fbbf24' : 'var(--text-muted)', fontWeight: 700 }}>
                {propStats.totalPnl >= targetProfit * 2 ? '✅ CONCLUÍDO' : propStats.totalPnl >= targetProfit ? 'ATIVO' : 'BLOQUEADO'}
              </span>
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }} className="prop-metric-value">
              Take SR: {currency} {targetProfit.toLocaleString('pt-BR')}
            </div>

            <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', paddingLeft: '1rem' }}>
              <li>Stop Loss Diário (25%): <strong>{currency} {(maxDrawdown * 0.25).toLocaleString('pt-BR')} / dia</strong></li>
              <li>Perda Máxima Total: <strong>{currency} {maxDrawdown.toLocaleString('pt-BR')}</strong></li>
              <li>Repasse de Lucros: <strong>80% (100% WeClub)</strong></li>
              <li>Pagamento em 3x na Mesa Real se fechar Mês 1 com <strong>&ge; {currency} {(maxDrawdown * 0.1).toLocaleString('pt-BR')} (10%)</strong></li>
            </ul>
          </div>

          {/* FASE 3: CONTA REAL (MESA REAL) */}
          <div style={{
            background: propStats.totalPnl >= targetProfit * 2 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${propStats.totalPnl >= targetProfit * 2 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
            padding: '1.25rem',
            borderRadius: '14px',
            opacity: propStats.totalPnl >= targetProfit * 2 ? 1 : 0.5
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: propStats.totalPnl >= targetProfit * 2 ? '#34d399' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                FASE 3: CONTA REAL (MESA REAL)
              </span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: propStats.totalPnl >= targetProfit * 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: propStats.totalPnl >= targetProfit * 2 ? '#34d399' : 'var(--text-muted)', fontWeight: 700 }}>
                {propStats.totalPnl >= targetProfit * 2 ? '🏆 CONTA REAL' : 'BLOQUEADO'}
              </span>
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }} className="prop-metric-value">
              Margem: {currency} {maxDrawdown.toLocaleString('pt-BR')}
            </div>

            <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', paddingLeft: '1rem' }}>
              <li>Stop Loss Diário Real: <strong>{currency} {(maxDrawdown * 0.25).toLocaleString('pt-BR')} / dia</strong></li>
              <li>Repasse: <strong>80% (100% WeClub)</strong></li>
              <li>Teto Saque Ciclo: <strong>{currency} {(maxDrawdown * (preset.maxWithdrawMultiplier || 2)).toLocaleString('pt-BR')}</strong></li>
              <li>Operação real no livro B3 via Subconta Mide</li>
            </ul>
          </div>

        </div>
      </div>

      <div className="prop-grid">
        
        {/* Coluna Esquerda: Presets & Configuração da Mesa */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="prop-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="#38bdf8" /> Parâmetros da Mesa
              </h3>

              {/* Toggle de Bloqueio de Regras Oficiais vs Edição Personalizada */}
              <button
                onClick={() => setIsCustomMode(!isCustomMode)}
                style={{
                  background: isCustomMode ? 'rgba(251, 191, 36, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                  color: isCustomMode ? '#fbbf24' : '#38bdf8',
                  border: `1px solid ${isCustomMode ? 'rgba(251, 191, 36, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isCustomMode ? <Unlock size={14} /> : <Lock size={14} />}
                {isCustomMode ? 'Edição Livre' : 'Regras Oficial MIDE'}
              </button>
            </div>

            {/* Selector de Presets */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Selecione o Plano MIDE PROP</label>
              
              {/* Botões Rápidos dos 4 Planos do Site */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
                {Object.entries(PROP_PRESETS).filter(([key]) => key !== 'CUSTOM').map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => {
                      handleSelectPreset(key);
                      setIsCustomMode(false);
                    }}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: '10px',
                      border: `1px solid ${selectedPresetKey === key ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                      background: selectedPresetKey === key ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: selectedPresetKey === key ? '#38bdf8' : 'var(--text-main)' }}>
                      {p.name.replace('MIDE PROP — ', '')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>
                      Meta: R$ {p.targetProfit.toLocaleString('pt-BR')}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      Stop: R$ {p.maxDrawdown.toLocaleString('pt-BR')}
                    </span>
                  </button>
                ))}
              </div>

              <select 
                value={selectedPresetKey}
                onChange={(e) => {
                  handleSelectPreset(e.target.value);
                  setIsCustomMode(e.target.value === 'CUSTOM');
                }}
                className="tactic-input"
                style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
              >
                {Object.entries(PROP_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Exibição Padronizada das Regras Oficiais MIDE (Bloqueado) vs Form Editável */}
            {!isCustomMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>🎯 Meta de Lucro (Take):</span>
                  <strong style={{ color: '#34d399' }}>{currency} {targetProfit.toLocaleString('pt-BR')}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>🛡️ Limite de Perda Total:</span>
                  <strong style={{ color: '#f87171' }}>{currency} {maxDrawdown.toLocaleString('pt-BR')}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>🛑 Stop Diário (Exame):</span>
                  <strong style={{ color: '#38bdf8' }}>Sem Stop Loss Diário</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>⚡ Stop Diário (SR / Real - 25%):</span>
                  <strong style={{ color: '#fbbf24' }}>{currency} {(maxDrawdown * 0.25).toLocaleString('pt-BR')} / dia</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>📊 Lote Máximo Permitido:</span>
                  <strong>{maxContracts} Contratos (WIN / WDO)</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>📅 Mínimo de Pregões:</span>
                  <strong>{minDays} Pregões Operados</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>⚖️ Regra de Consistência:</span>
                  <strong>Máx {maxConsistencyPct}% (R$ {(targetProfit * 0.5).toLocaleString('pt-BR')})</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>⏱️ Prazo do Exame:</span>
                  <strong style={{ color: '#34d399' }}>ILIMITADO</strong>
                </div>
              </div>
            ) : (
              /* Inputs Manualmente Editáveis para Modo Personalizado */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Banca Base / Margem ({currency})</label>
                  <input 
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="tactic-input prop-metric-value"
                    style={{ fontSize: '0.95rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#34d399', display: 'block', marginBottom: '4px' }}>Meta de Lucro ({currency})</label>
                    <input 
                      type="number"
                      value={targetProfit}
                      onChange={(e) => setTargetProfit(Number(e.target.value))}
                      className="tactic-input prop-metric-value"
                      style={{ fontSize: '0.95rem', color: '#34d399' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#f87171', display: 'block', marginBottom: '4px' }}>Stop Loss Total ({currency})</label>
                    <input 
                      type="number"
                      value={maxDrawdown}
                      onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                      className="tactic-input prop-metric-value"
                      style={{ fontSize: '0.95rem', color: '#f87171' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'block', marginBottom: '4px' }}>
                      Perda Diária ({currency})
                    </label>
                    <input 
                      type="number"
                      value={dailyDrawdown}
                      onChange={(e) => setDailyDrawdown(Number(e.target.value))}
                      className="tactic-input prop-metric-value"
                      style={{ fontSize: '0.95rem', color: '#fbbf24' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Lote Máximo</label>
                    <input 
                      type="number"
                      value={maxContracts}
                      onChange={(e) => setMaxContracts(Number(e.target.value))}
                      className="tactic-input prop-metric-value"
                      style={{ fontSize: '0.95rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Dias Mínimos</label>
                    <input 
                      type="number"
                      value={minDays}
                      onChange={(e) => setMinDays(Number(e.target.value))}
                      className="tactic-input prop-metric-value"
                      style={{ fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Max Consistência (%)</label>
                    <input 
                      type="number"
                      value={maxConsistencyPct}
                      onChange={(e) => setMaxConsistencyPct(Number(e.target.value))}
                      className="tactic-input prop-metric-value"
                      style={{ fontSize: '0.95rem' }}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Card Meta Diária Recomendada */}
          <div className="prop-card" style={{ background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
            <h4 style={{ fontSize: '0.9rem', color: '#38bdf8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} /> Meta Diária Sugerida
            </h4>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }} className="prop-metric-value">
              {currency} <AnimatedCounter value={propStats.recommendedDailyTarget} decimals={0} /> / dia
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Dividindo o saldo faltante pelos dias restantes de operação recomendados.
            </p>
          </div>

        </div>

        {/* Coluna Direita: Cockpit de Monitoramento */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card de Progresso Principal: Meta de Lucro */}
          <div className="prop-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Resultado Acumulado vs Meta de Aprovação</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: propStats.totalPnl >= 0 ? '#34d399' : '#f87171' }} className="prop-metric-value">
                  {currency} <AnimatedCounter value={propStats.totalPnl} decimals={2} /> 
                  <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {currency} {targetProfit.toLocaleString('pt-BR')}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }} className="prop-metric-value">
                  {propStats.profitProgressPct.toFixed(1)}%
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Concluído</span>
              </div>
            </div>

            {/* Barra de Progresso da Meta */}
            <div className="prop-progress-bar">
              <div 
                className="prop-progress-fill" 
                style={{ 
                  width: `${propStats.profitProgressPct}%`,
                  background: 'linear-gradient(90deg, #38bdf8 0%, #34d399 100%)'
                }} 
              />
            </div>
          </div>

          {/* Medidor de Colchão do Stop Total (Drawdown) */}
          <div className="prop-card" style={{ background: propStats.drawdownBuffer < maxDrawdown * 0.3 ? 'rgba(239,68,68,0.08)' : 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} color={propStats.drawdownBuffer < maxDrawdown * 0.3 ? '#f87171' : '#fbbf24'} /> Margem & Stop Loss Total MIDE
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Limite máximo de perda acumulada antes da desqualificação da conta.
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: propStats.drawdownBuffer < maxDrawdown * 0.3 ? '#f87171' : '#38bdf8' }} className="prop-metric-value">
                  {currency} <AnimatedCounter value={propStats.drawdownBuffer} decimals={2} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Folga de Risco</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Pico Máximo</span>
                <strong style={{ fontSize: '1rem' }} className="prop-metric-value">{currency} {propStats.peakCapital.toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Limite de Corte Total</span>
                <strong style={{ fontSize: '1rem', color: '#f87171' }} className="prop-metric-value">{currency} {propStats.trailingStopLevel.toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Stop Diário (SR/Real)</span>
                <strong style={{ fontSize: '1rem', color: '#fbbf24' }} className="prop-metric-value">{currency} {(maxDrawdown * 0.25).toLocaleString('pt-BR')}</strong>
              </div>
            </div>
          </div>

          {/* Grid de Regras de Consistência e Dias */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Regra de Consistência */}
            <div className="prop-card" style={{ borderColor: propStats.isConsistencyViolated ? 'rgba(245,158,11,0.5)' : 'var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Regra de Consistência (Maior Dia)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: propStats.isConsistencyViolated ? '#fbbf24' : '#34d399' }} className="prop-metric-value">
                {propStats.consistencyPct.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Maior lucro num dia: {currency} {propStats.maxWinningDayPnL.toFixed(2)} (Máx da mesa: {maxConsistencyPct}%)
              </div>
            </div>

            {/* Dias Operados vs Mínimos */}
            <div className="prop-card">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Dias de Operação</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }} className="prop-metric-value">
                {propStats.daysTraded} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {minDays} dias</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {propStats.daysTraded >= minDays ? '✅ Requisito de dias mínimos atingido!' : `Faltam ${Math.max(0, minDays - propStats.daysTraded)} dias operados`}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Calculadora Inteligente de Repasses & Saques MIDE (Mesa Real & SR) */}
      <div className="prop-card" style={{ marginTop: '2rem', background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, var(--bg-card) 100%)', borderColor: 'rgba(56, 189, 248, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
              <Calculator size={22} /> Calculadora de Repasses & Saques MIDE (Mesa Real)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Simule o valor exato a receber na sua conta bancária na Mesa Real (100% WeClub vs 80% Padrão + IR + Parcela do Take do SR).
            </p>
          </div>

          {/* Toggle WeClub */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setIsWeClubMember(true)}
              style={{
                background: isWeClubMember ? '#38bdf8' : 'transparent',
                color: isWeClubMember ? '#0f172a' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={14} /> Membro WeClub (100% Repasse)
            </button>
            <button
              onClick={() => setIsWeClubMember(false)}
              style={{
                background: !isWeClubMember ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: !isWeClubMember ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Padrão (80% Repasse)
            </button>
          </div>
        </div>

        {/* Form e Grid de Simulação */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', marginBottom: '1rem' }}>
          
          {/* Entradas da Simulação */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Lucro Bruto Simulado na Mesa Real ({currency}):
              </label>
              <input
                type="number"
                value={simulatedProfitInput}
                onChange={(e) => setSimulatedProfitInput(e.target.value)}
                placeholder={`Padrão: ${currency} ${payoutCalc.profitToUse.toLocaleString('pt-BR')}`}
                className="tactic-input"
                style={{ width: '100%', fontSize: '0.95rem', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Você pode simular qualquer valor ou usar o acumulado atual ({currency} {propStats.totalPnl.toFixed(2)}).
              </span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={includeSrBonus}
                onChange={(e) => setIncludeSrBonus(e.target.checked)}
                style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }}
              />
              Incluir 1/3 do Take do SR ({currency} {(targetProfit / 3).toFixed(2)})
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '-6px' }}>
              Requisito: Mês 1 da Mesa Real com no mínimo 10% de margem positiva.
            </span>
          </div>

          {/* Resultado Detalhado do Repasse */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lucro Bruto Gerado:</span>
                <strong>{currency} {payoutCalc.profitToUse.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span style={{ color: '#f87171' }}>Imposto de Renda (IR 20%):</span>
                <span style={{ color: '#f87171', fontWeight: 600 }}>- {currency} {payoutCalc.irTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Percentual de Repasse ({isWeClubMember ? 'WeClub 100%' : 'Padrão 80%'}):</span>
                <strong style={{ color: isWeClubMember ? '#34d399' : '#fbbf24' }}>{payoutCalc.splitRatePct}%</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Repasse Base Trader:</span>
                <strong>{currency} {payoutCalc.traderShare.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>

              {includeSrBonus && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#38bdf8' }}>Parcela 1/3 do Take SR:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>+ {currency} {payoutCalc.srBonusPortion.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            {/* Total Líquido a Receber */}
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '2px dashed rgba(56, 189, 248, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>VALOR LÍQUIDO A RECEBER:</span>
                {payoutCalc.isCapped && (
                  <span style={{ fontSize: '0.7rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} /> Teto do Ciclo Atingido ({currency} {payoutCalc.payoutCap.toLocaleString('pt-BR')})
                  </span>
                )}
              </div>

              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#34d399' }} className="prop-metric-value">
                {currency} <AnimatedCounter value={payoutCalc.finalPayout} decimals={2} />
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Tabela Detalhada das Operações Carregadas do ProfitChart */}
      <div className="prop-card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#34d399" /> Extrato de Operações Carregadas do ProfitChart
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Lista completa de trades alimentando as estatísticas e evolução do exame.
            </p>
          </div>

          <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700 }}>
            {propStats.normalizedTrades.length} trades importados
          </span>
        </div>

        {propStats.normalizedTrades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <UploadCloud size={36} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '8px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Nenhuma operação carregada no cockpit ainda.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
              Cole o texto do relatório do ProfitChart ou envie o arquivo CSV no painel superior para alimentar os dados.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px' }}>#</th>
                  <th style={{ padding: '10px' }}>Data / Hora</th>
                  <th style={{ padding: '10px' }}>Ativo</th>
                  <th style={{ padding: '10px' }}>Lado</th>
                  <th style={{ padding: '10px' }}>Contratos</th>
                  <th style={{ padding: '10px' }}>Res. Bruto</th>
                  <th style={{ padding: '10px' }}>Res. Líquido (MIDE)</th>
                  <th style={{ padding: '10px' }}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {propStats.normalizedTrades.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{t.rawDateStr}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', fontWeight: 700, fontSize: '0.75rem' }}>
                        {t.asset}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: t.side === 'COMPRA' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(168, 85, 247, 0.15)', color: t.side === 'COMPRA' ? '#34d399' : '#c084fc', fontWeight: 700, fontSize: '0.75rem' }}>
                        {t.side}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{t.quantity} cx</td>
                    <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{currency} {t.rawPnl.toFixed(2)}</td>
                    <td style={{ padding: '10px', fontWeight: 800, color: t.netPnl >= 0 ? '#34d399' : '#f87171' }}>
                      {currency} {t.netPnl.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: t.netPnl >= 0 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: t.netPnl >= 0 ? '#34d399' : '#f87171', fontWeight: 700, fontSize: '0.75rem' }}>
                        {t.netPnl >= 0 ? 'WIN 🟢' : 'LOSS 🔴'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal do Regulamento Oficial MIDE PROP */}
      {showContractModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#0b1329',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            {/* Header do Modal */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8', fontWeight: 800, fontSize: '1.1rem' }}>
                <FileText size={22} />
                <span>Termos e Regulamento Oficial MIDE PROP — Plano Exame</span>
              </div>
              <button 
                onClick={() => setShowContractModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Corpo do Modal com Scroll */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              color: 'var(--text-main)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              
              <div style={{ background: 'rgba(56, 189, 248, 0.06)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <strong>📌 Resumo dos Planos Oficiais da MIDE:</strong>
                <ul style={{ marginTop: '6px', paddingLeft: '1.25rem' }}>
                  <li><strong>CONSERVADOR:</strong> Meta Take Exame R$ 1.400,00 | Margem Total R$ 2.100,00 | Máx 10 Contratos | Stop Diário SR/Real R$ 525,00 (25%)</li>
                  <li><strong>ARROJADO:</strong> Meta Take Exame R$ 2.400,00 | Margem Total R$ 3.300,00 | Máx 20 Contratos | Stop Diário SR/Real R$ 825,00 (25%)</li>
                  <li><strong>AGRESSIVO:</strong> Meta Take Exame R$ 5.000,00 | Margem Total R$ 6.200,00 | Máx 30 Contratos | Stop Diário SR/Real R$ 1.550,00 (25%)</li>
                  <li><strong>MIDE PLUS:</strong> Meta Take Exame R$ 10.500,00 | Margem Total R$ 12.700,00 | Máx 40 Contratos | Stop Diário SR/Real R$ 3.175,00 (25%)</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: '#38bdf8', marginBottom: '4px' }}>01. Regras Operacionais & Consistência</h4>
                <p>• <strong>Sem Stop Diário no Exame:</strong> Na etapa Exame não há limite de perda diária, apenas a Perda Total acumulada.</p>
                <p>• <strong>Stop Loss Diário no SR e Mesa Real:</strong> O stop diário é de 25% (1/4) do Stop Loss Total do plano contratado.</p>
                <p>• <strong>Regra dos 50%:</strong> Nenhum dia isolado pode representar mais de 50% da meta total do plano no Exame ou Simulador Remunerado.</p>
                <p>• <strong>Mínimo 5 Pregões:</strong> Obrigatório operar ao menos 5 pregões em cada etapa (Exame, SR e Mesa Real).</p>
              </div>

              <div>
                <h4 style={{ color: '#38bdf8', marginBottom: '4px' }}>02. Repasses & Benefícios WeClub</h4>
                <p>• <strong>Membros WeClub:</strong> Repasse de 100% do saldo líquido positivo (após desconto de IR 20% + taxas operacionais).</p>
                <p>• <strong>Não-Membros WeClub:</strong> Repasse de 80% do saldo líquido positivo.</p>
                <p>• <strong>Pagamento do Take do Simulador Remunerado:</strong> Pago em 3x junto aos repasses da Mesa Real, desde que o Mês 1 da Mesa Real feche com no mínimo 10% positivo sobre a margem total (Conservador: R$ 210, Arrojado: R$ 330, Agressivo: R$ 620, Mide+: R$ 1.270).</p>
              </div>

              <div>
                <h4 style={{ color: '#38bdf8', marginBottom: '4px' }}>03. Contas Múltiplas & Saques</h4>
                <p>• Limite de até 7 contas no total (máximo 5 contas em Mesa Real).</p>
                <p>• Teto de saque por ciclo: Conservador (3x Perda Total = R$ 6.300), Arrojado (2.5x = R$ 8.250), Agressivo (2x = R$ 12.400), Mide Plus (2x = R$ 25.400).</p>
              </div>

              <div>
                <h4 style={{ color: '#38bdf8', marginBottom: '4px' }}>04. Taxas Operacionais Por Contrato</h4>
                <p>• Mini-Índice (WIN): R$ 0,35 / contrato (R$ 0,30 no WeClub)</p>
                <p>• Mini-Dólar (WDO): R$ 1,35 / contrato (R$ 1,25 no WeClub)</p>
              </div>

            </div>

            {/* Footer do Modal */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justify: 'flex-end'
            }}>
              <button 
                onClick={() => setShowContractModal(false)}
                className="tactic-btn"
                style={{ padding: '0.6rem 1.5rem', background: '#38bdf8', color: '#0f172a', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', border: 'none' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação Visual do Profit (Nelogica) */}
      <VisualImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        addTradesBulk={addTradesBulk} 
      />

    </div>
  );
};

export default MesaProprietaria;

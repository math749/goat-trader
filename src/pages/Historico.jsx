import { useState } from 'react';
import { History, UploadCloud, Trash2, AlertCircle, Plus, X } from 'lucide-react';
import { useTrades } from '../contexts/TradeContext';
import VisualImportModal from '../components/VisualImportModal';

const Historico = () => {
  const { trades, clearTrades, addTrade, addTradesBulk } = useTrades();
  const [error] = useState(null);
  const [successMsg] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Estados para o formulário manual
  const [formData, setFormData] = useState({
    data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR').substring(0,5),
    ativo: 'WINM26',
    lado: 'C',
    qtd: 1,
    bruto: 0
  });

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const newTrade = {
      'data': formData.data,
      'ativo': formData.ativo,
      'lado': formData.lado,
      'quantidade': formData.qtd,
      'resultado líquido': parseFloat(formData.bruto) // o parser lê bruto como liquido depois desconta custo
    };
    addTrade(newTrade);
    setIsModalOpen(false);
    setFormData({ ...formData, bruto: 0 }); // reset
  };

  const formatCurrencyNum = (numeric) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2><History size={24} color="var(--primary-accent)" /> Histórico</h2>
            <p>Gerencie seu Relatório de Desempenho do Profit Pro.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn btn-primary"
              onClick={() => setIsImportModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary-accent)', color: 'white', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
            >
              <UploadCloud size={18} /> Importar Relatório Profit (.csv)
            </button>
            <button 
              className="btn btn-outline"
              onClick={() => setIsModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--border-subtle)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px' }}
            >
              <Plus size={18} /> Add Manual
            </button>
            {trades.length > 0 && (
              <button 
                className="btn btn-danger" 
                onClick={clearTrades}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                <Trash2 size={18} /> Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertCircle size={24} color="var(--danger)" />
          <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid var(--success)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertCircle size={24} color="var(--success)" />
          <p style={{ color: 'var(--success)', margin: 0 }}>{successMsg}</p>
        </div>
      )}

      {/* Modal Adicionar Operação */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Nova Operação</h3>
            
            <form onSubmit={handleManualSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Data e Hora</label>
                <input type="text" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)' }} required />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Ativo (ex: WINM26, WDO...)</label>
                <input type="text" value={formData.ativo} onChange={e => setFormData({...formData, ativo: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)' }} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Lado</label>
                  <select value={formData.lado} onChange={e => setFormData({...formData, lado: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)' }}>
                    <option value="C">Compra</option>
                    <option value="V">Venda</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Quantidade</label>
                  <input type="number" value={formData.qtd} onChange={e => setFormData({...formData, qtd: e.target.value})} min="1" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)' }} required />
                </div>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Resultado Bruto (R$)</label>
                <input type="number" step="0.01" value={formData.bruto} onChange={e => setFormData({...formData, bruto: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)' }} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', cursor: 'pointer', border: 'none', borderRadius: '8px', backgroundColor: 'var(--primary-accent)', color: 'white', fontWeight: 'bold' }}>
                Salvar Operação
              </button>
            </form>
          </div>
        </div>
      )}

      {trades.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL OPERAÇÕES</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>{trades.length}</div>
          </div>
          <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CUSTO B3 ESTIMADO</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.2rem' }}>
              {formatCurrencyNum(trades.reduce((acc, t) => {
                const ativo = t['ativo'] || t['Ativo'] || '';
                const numQtd = parseInt(String(t['quantidade'] || t['qtd'] || 1)) || 1;
                let c = 0;
                if (ativo.toUpperCase().startsWith('WIN')) c = 0.25;
                else if (ativo.toUpperCase().startsWith('WDO')) c = 1.00;
                else if (ativo.toUpperCase().startsWith('BIT')) c = 0.72;
                return acc + (c * 2 * numQtd);
              }, 0))}
            </div>
          </div>
          <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PNL LÍQUIDO TOTAL</span>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: trades.reduce((acc, t) => {
                const r = parseFloat(String(t['resultado líquido'] || t['resultado'] || 0).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
                return acc + r;
              }, 0) >= 0 ? 'var(--success)' : 'var(--danger)',
              marginTop: '0.2rem'
            }}>
              {formatCurrencyNum(trades.reduce((acc, t) => {
                const r = parseFloat(String(t['resultado líquido'] || t['resultado'] || 0).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
                return acc + r;
              }, 0))}
            </div>
          </div>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', textAlign: 'center', border: '2px dashed var(--border-subtle)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <UploadCloud size={32} color="var(--primary-accent)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Importe seu Relatório do Profit Pro / MT5</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '440px', lineHeight: 1.6 }}>
            No Profit Pro, acesse <strong>Relatório de Performance &gt; Clique com botão direito &gt; Exportar para Excel/CSV</strong>. Arraste o arquivo para automação total de PnL e IR.
          </p>
          
          <button 
            className="btn btn-primary" 
            onClick={() => setIsImportModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 2rem', backgroundColor: 'var(--primary-accent)', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 0 20px rgba(56,189,248,0.3)' }}
          >
            <UploadCloud size={20} />
            Importar Relatório Profit (.csv)
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem' }}>Data / Hora</th>
                  <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem' }}>Ativo</th>
                  <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem' }}>Lado</th>
                  <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem' }}>Qtd</th>
                  <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Bruto</th>
                  <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Custo B3</th>
                  <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Resultado Líquido</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, index) => {
                  const data = trade['abertura'] || trade['data'] || trade['hora'] || trade['Abertura'] || trade['Data'] || '--';
                  const ativo = trade['ativo'] || trade['Ativo'] || '--';
                  const lado = trade['lado'] || trade['operação'] || trade['operacao'] || trade['Lado'] || 'C';
                  const qtd = trade['quantidade'] || trade['qtd'] || trade['qtd compra'] || trade['qtd venda'] || trade['Quantidade'] || '1';
                  
                  const resultadoStr = trade['resultado líquido'] || trade['resultado liquido'] || trade['res. operação'] || trade['res operacao'] || trade['resultado'] || trade['Resultado (R$)'] || trade['total'] || '0';
                  const bruto = parseFloat(String(resultadoStr).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

                  const numQtd = parseInt(String(qtd).replace(/[^\d]/g, '')) || 1;
                  let custoPorPerna = 0;
                  const uAtivo = ativo.toUpperCase();
                  if (uAtivo.startsWith('WIN')) custoPorPerna = 0.25;
                  else if (uAtivo.startsWith('WDO')) custoPorPerna = 1.00;
                  else if (uAtivo.startsWith('BIT')) custoPorPerna = 0.72;
                  
                  const custo = custoPorPerna * 2 * numQtd;
                  const liquido = bruto - custo;
                  const isWin = liquido > 0;
                  const isLoss = liquido < 0;

                  const isCompra = String(lado).toUpperCase().startsWith('C') || String(lado).toUpperCase().includes('COMPRA');

                  return (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{data}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: 'var(--text-main)' }}>{ativo}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: isCompra ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isCompra ? '#38bdf8' : '#f59e0b'
                        }}>
                          {isCompra ? 'COMPRA' : 'VENDA'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{numQtd}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '700', textAlign: 'right', fontFamily: 'var(--font-mono)', color: bruto > 0 ? 'var(--success)' : (bruto < 0 ? 'var(--danger)' : 'var(--text-main)') }}>
                        {formatCurrencyNum(bruto)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        -{formatCurrencyNum(custo)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.85rem',
                          background: isWin ? 'rgba(16, 185, 129, 0.15)' : (isLoss ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)'),
                          color: isWin ? '#10b981' : (isLoss ? '#ef4444' : 'var(--text-main)'),
                          boxShadow: isWin ? '0 0 10px rgba(16,185,129,0.2)' : (isLoss ? '0 0 10px rgba(239,68,68,0.2)' : 'none')
                        }}>
                          {isWin ? '● WIN ' : (isLoss ? '● LOSS ' : '● EVEN ')}
                          {formatCurrencyNum(liquido)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NOVO MODAL DE IMPORTAÇÃO VISUAL (DRAG AND DROP) */}
      <VisualImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        addTradesBulk={addTradesBulk} 
      />
    </div>
  );
};

export default Historico;

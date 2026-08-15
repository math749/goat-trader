import { useState, useRef, useMemo } from 'react';
import { BookOpen, Save, Upload, X, Tag, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { useTrades } from '../contexts/TradeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Diario.css';

const BEHAVIOR_TAGS = [
  { id: 'fomo', label: 'FOMO', color: '#f59e0b', icon: <TrendingDown size={14}/> },
  { id: 'hesitacao', label: 'Hesitação', color: '#a855f7', icon: <AlertTriangle size={14}/> },
  { id: 'tilt', label: 'Tilt', color: '#ef4444', icon: <AlertTriangle size={14}/> },
  { id: 'plano_seguido', label: 'Plano Seguido', color: '#22c55e', icon: <CheckCircle size={14}/> },
  { id: 'antecipacao', label: 'Antecipação', color: '#3b82f6', icon: <TrendingDown size={14}/> },
];

const Diario = () => {
  const { getDailyMetrics, diarios, saveDiarioEntry } = useTrades();
  const todayStr = new Date().toLocaleDateString('pt-BR');

  const [formData, setFormData] = useState(() => {
    if (diarios && diarios[todayStr]) {
      return diarios[todayStr];
    }
    const saved = localStorage.getItem('matilha-diario-hoje');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignorar erro
      }
    }
    return {
      sentimentoAntes: 'Focado e Calmo',
      acertos: '',
      erros: '',
      resumo: '',
      tags: [],
      printUrl: null
    };
  });

  const fileInputRef = useRef(null);

  const handleTagToggle = (tagId) => {
    setFormData(prev => {
      const isSelected = prev.tags.includes(tagId);
      const newTags = isSelected 
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId];
      return { ...prev, tags: newTags };
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Converte a imagem para Base64 para salvar no localStorage
    const reader = new FileReader();
    reader.onload = (evt) => {
      setFormData(prev => ({ ...prev, printUrl: evt.target.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, printUrl: null }));
  };

  const handleSave = () => {
    saveDiarioEntry(todayStr, formData);
    localStorage.setItem('matilha-diario-hoje', JSON.stringify(formData));
    alert('Diário salvo com sucesso!');
  };

  const correlationData = useMemo(() => {
    const stats = {};
    BEHAVIOR_TAGS.forEach(tag => {
      stats[tag.id] = { name: tag.label, profit: 0, count: 0, color: tag.color };
    });

    Object.keys(diarios || {}).forEach(dateStr => {
      const entry = diarios[dateStr];
      if (!entry.tags || entry.tags.length === 0) return;
      
      const metrics = getDailyMetrics(dateStr);
      if (metrics) {
        entry.tags.forEach(tagId => {
          if (stats[tagId]) {
            stats[tagId].profit += metrics.totalProfitRaw || 0;
            stats[tagId].count += 1;
          }
        });
      }
    });

    return Object.values(stats).filter(s => s.count > 0);
  }, [diarios, getDailyMetrics]);

  const worstEmotion = [...correlationData].sort((a, b) => a.profit - b.profit)[0];
  const bestEmotion = [...correlationData].sort((a, b) => b.profit - a.profit)[0];

  // Correlação Emocional conectada ao Histórico
  const renderCorrelationCard = () => {
    // Busca dados do dia de hoje (formato DD/MM/AAAA)
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const metrics = getDailyMetrics(todayStr);

    const hasNegativeTags = formData.tags.some(t => ['fomo', 'tilt', 'antecipacao'].includes(t));

    let message = "Registre suas emoções e suba seu relatório do Profit para ver a correlação do dia.";
    let type = "warning"; // success, warning, danger
    let winrate = metrics ? `${metrics.winRate}%` : "--%";
    let profit = metrics ? `R$ ${metrics.totalProfit}` : "--";

    if (metrics) {
      if (metrics.isPositiveDay) {
        message = hasNegativeTags 
          ? "Você saiu positivo, mas as tags negativas indicam que correu riscos desnecessários. Cuidado!"
          : "Excelente trabalho! Disciplina alinhada com resultados financeiros positivos.";
        type = "success";
      } else {
        message = hasNegativeTags
          ? "As tags negativas explicam o resultado de hoje. O descontrole emocional custa caro."
          : "Dia de loss, mas dentro do plano. Faz parte da estatística do seu operacional.";
        type = "danger";
      }
    } else if (hasNegativeTags) {
      message = "Atenção: Emoções negativas marcadas. Sugerimos pausar as operações agora.";
      type = "danger";
    }

    return (
      <div className={`correlation-card correlation-${type} tactic-panel`}>
        <div className="correlation-content">
          <h4>Correlação Emocional</h4>
          <p>{message}</p>
        </div>
        <div className="correlation-metric">
          <span>Win Rate Hoje</span>
          <strong>{winrate}</strong>
        </div>
        {metrics && (
          <div className="correlation-metric" style={{ marginTop: '1rem' }}>
            <span>Resultado Financeiro</span>
            <strong style={{ color: metrics.isPositiveDay ? 'var(--success)' : 'var(--danger)' }}>{profit}</strong>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="diario-container animate-fade-in">
      <div className="page-header">
        <h2><BookOpen size={24} color="var(--primary-accent)" /> Diário do Dia</h2>
        <p>Registre seus trades, acertos, erros e o seu estado emocional.</p>
      </div>

      <div className="diario-layout">
        
        {/* Formulário Principal */}
        <div className="tactic-panel form-section">
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div className="input-group">
              <label>Como você estava se sentindo antes de operar?</label>
              <select 
                className="tactic-input"
                value={formData.sentimentoAntes}
                onChange={e => setFormData({...formData, sentimentoAntes: e.target.value})}
              >
                <option>Focado e Calmo</option>
                <option>Ansioso / Apressado</option>
                <option>Cansado / Desmotivado</option>
                <option>Eufórico / Confiante Demais</option>
              </select>
            </div>

            {/* Nova Seção: Tags de Comportamento */}
            <div className="input-group">
              <label><Tag size={16} style={{display:'inline', marginRight:'0.5rem', color: 'var(--primary-accent)'}}/> Tags de Comportamento do Dia</label>
              <p className="helper-text">Quais emoções ou comportamentos dominaram seus trades?</p>
              <div className="tags-container">
                {BEHAVIOR_TAGS.map(tag => {
                  const isSelected = formData.tags.includes(tag.id);
                  const isDanger = tag.id === 'fomo' || tag.id === 'tilt';
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`behavior-tag ${isSelected ? 'selected' : ''} ${isDanger ? tag.id : ''}`}
                      style={{ 
                        borderColor: isSelected ? tag.color : 'rgba(255,255,255,0.1)',
                        color: isSelected ? tag.color : 'var(--text-muted)'
                      }}
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      {tag.icon}
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="input-group">
              <label>O que você fez bem hoje? (Acertos)</label>
              <textarea 
                className="tactic-input"
                rows="3" 
                placeholder="Ex: Segui o plano, esperei o setup confirmar..."
                value={formData.acertos}
                onChange={e => setFormData({...formData, acertos: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label>Onde você errou? (Erros)</label>
              <textarea 
                className="tactic-input"
                rows="3" 
                placeholder="Ex: Hesitei na entrada, saí cedo do trade..."
                value={formData.erros}
                onChange={e => setFormData({...formData, erros: e.target.value})}
              />
            </div>

            {/* Nova Seção: Print da Tela */}
            <div className="input-group">
              <label>Anexar Gráfico / Print do Trade</label>
              <p className="helper-text">Suba o print do seu gráfico para revisar a entrada visualmente depois.</p>
              
              {!formData.printUrl ? (
                <div className="tactic-upload-area" onClick={() => fileInputRef.current.click()}>
                  <Upload size={28} color="var(--primary-accent)" />
                  <span>Clique para anexar o print (PNG/JPG)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    style={{display:'none'}}
                    onChange={handleImageUpload}
                  />
                </div>
              ) : (
                <div className="image-preview-container">
                  <img src={formData.printUrl} alt="Print do trade" className="image-preview" />
                  <button type="button" className="btn-remove-image" onClick={removeImage}>
                    <X size={16} /> Remover
                  </button>
                </div>
              )}
            </div>

            <div className="input-group">
              <label>Resumo dos Trades e Lições Aprendidas</label>
              <textarea 
                className="tactic-input"
                rows="5" 
                placeholder="Descreva os trades de forma livre e o que aprendeu hoje."
                value={formData.resumo}
                onChange={e => setFormData({...formData, resumo: e.target.value})}
              />
            </div>

            <button type="button" className="btn btn-primary" onClick={handleSave} style={{ alignSelf: 'flex-end', width: '200px' }}>
              <Save size={18} /> Salvar Diário
            </button>
          </form>
        </div>

        {/* Sidebar do Diário */}
        <div className="diario-sidebar">
          {renderCorrelationCard()}

          <div className="tactic-panel insights-card">
            <h3>Por que o print é importante?</h3>
            <p>Revisar a imagem do gráfico é mil vezes mais eficiente do que apenas ler números. O nosso cérebro processa o padrão visual da sua entrada, ajudando a evitar os mesmos erros (ou repetir os mesmos acertos) no futuro.</p>
          </div>
        </div>

      </div>

      {/* Analytics: Emoção vs Dinheiro */}
      <div className="tactic-panel" style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Activity size={20} color="var(--primary-accent)" /> 
          Laboratório: Quanto suas Emoções Custam?
        </h3>
        
        {correlationData.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {worstEmotion && worstEmotion.profit < 0 && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  ⚠️ O comportamento <strong>{worstEmotion.name}</strong> é o seu calcanhar de Aquiles. 
                  Sempre que você marca essa tag, você acumula perdas. Prejuízo histórico com essa emoção: 
                  <strong style={{ color: 'var(--danger)', marginLeft: '6px' }}>R$ {worstEmotion.profit.toFixed(2)}</strong>.
                </p>
              </div>
            )}
            
            {bestEmotion && bestEmotion.profit > 0 && (
              <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderLeft: '4px solid var(--success)', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  ✅ A emoção <strong>{bestEmotion.name}</strong> te faz ganhar dinheiro. 
                  Esse é o seu estado mental de alta performance! Lucro histórico: 
                  <strong style={{ color: 'var(--success)', marginLeft: '6px' }}>R$ {bestEmotion.profit.toFixed(2)}</strong>.
                </p>
              </div>
            )}

            <div style={{ width: '100%', height: 350, marginTop: '1rem', background: 'rgba(0,0,0,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)' }}>
              <ResponsiveContainer>
                <BarChart data={correlationData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(val) => `R$ ${val}`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'rgba(10, 10, 12, 0.95)', border: '1px solid var(--primary-accent)', borderRadius: '8px', color: 'white', boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)' }}
                    formatter={(value, name, props) => [`R$ ${value.toFixed(2)}`, `Resultado Agregado (${props.payload.count} dias)`]}
                  />
                  <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                    {correlationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? 'var(--success)' : 'var(--danger)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
              O gráfico agrega o resultado financeiro de todos os dias em que a respectiva tag comportamental foi ativada.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', opacity: 0.7 }}>
            <TrendingUp size={48} style={{ marginBottom: '1rem' }} />
            <p>Preencha seus diários com as tags de comportamento para habilitar esta análise matemática avançada.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Diario;

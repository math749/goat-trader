import { useState, useEffect, useRef } from 'react';
import { Target, Shield, AlertTriangle } from 'lucide-react';
import { gsap } from 'gsap';
import './Plano.css';

const Plano = () => {
  const [isSigned, setIsSigned] = useState(() => {
    const lastSigned = localStorage.getItem('planSignedDate');
    const today = new Date().toLocaleDateString();
    return lastSigned === today;
  });
  const [formData, setFormData] = useState(() => {
    const savedPlan = localStorage.getItem('tradingPlan');
    if (savedPlan) {
      try {
        return JSON.parse(savedPlan);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      vision: '',
      targetCapital: '',
      currentCapital: '',
      setupName: '',
      setupTriggers: '',
      dailyLossLimit: '',
      weeklyLossLimit: '',
      dailyGoal: '',
      allowedAssets: ''
    };
  });

  const progressBarRef = useRef(null);
  const stampRef = useRef(null);

  // Save to localStorage when form changes
  useEffect(() => {
    localStorage.setItem('tradingPlan', JSON.stringify(formData));
  }, [formData]);

  const calculateProgress = () => {
    const target = parseFloat(formData.targetCapital) || 0;
    const current = parseFloat(formData.currentCapital) || 0;
    if (target === 0) return 0;
    const percentage = (current / target) * 100;
    return Math.min(Math.max(percentage, 0), 100).toFixed(1);
  };

  // Animate Progress Bar
  useEffect(() => {
    const target = parseFloat(formData.targetCapital) || 0;
    const current = parseFloat(formData.currentCapital) || 0;
    let progress = 0;
    if (target !== 0) {
      const percentage = (current / target) * 100;
      progress = Math.min(Math.max(percentage, 0), 100).toFixed(1);
    }
    
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        width: `${progress}%`,
        duration: 1.5,
        ease: 'power3.out',
        delay: 0.2
      });
    }
  }, [formData.currentCapital, formData.targetCapital]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSign = () => {
    if (isSigned) return;

    // Stamp animation
    if (stampRef.current) {
      gsap.to(stampRef.current, {
        opacity: 1,
        scale: 1,
        rotate: -5,
        duration: 0.5,
        ease: 'back.out(1.7)',
        onComplete: () => {
          setIsSigned(true);
          localStorage.setItem('planSignedDate', new Date().toLocaleDateString());
          gsap.to(stampRef.current, {
            opacity: 0,
            duration: 0.3,
            delay: 1.5
          });
        }
      });
    } else {
      setIsSigned(true);
      localStorage.setItem('planSignedDate', new Date().toLocaleDateString());
    }
  };

  return (
    <div className="plano-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px', textTransform: 'uppercase' }}>
          Protocolo Tático
        </h2>
        <p style={{ color: 'var(--text-muted)', fontFamily: '"Courier New", Courier, monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Defina as regras. Siga as regras. Sobreviva.
        </p>
      </div>

      <div className="plano-grid">
        {/* Lado Esquerdo: Objetivo Tático */}
        <div className="vision-card">
          <div className="card">
            <div className="card-header">
              <Target size={20} color="#fff" />
              <h3>Objetivo Tático</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', marginTop: '0.5rem', fontFamily: '"Courier New", Courier, monospace' }}>
              Qual é a missão final?
            </p>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Declaração de Missão</label>
              <textarea 
                name="vision" 
                value={formData.vision} 
                onChange={handleChange}
                placeholder="Ex: Liberdade geográfica, pagar a faculdade dos filhos..."
                rows="3"
              />
            </div>

            <div className="form-row" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Capital Alvo (R$)</label>
                <input 
                  type="number" 
                  name="targetCapital" 
                  value={formData.targetCapital} 
                  onChange={handleChange}
                  placeholder="Ex: 100000"
                />
              </div>
              <div className="form-group">
                <label>Patrimônio Atual (R$)</label>
                <input 
                  type="number" 
                  name="currentCapital" 
                  value={formData.currentCapital} 
                  onChange={handleChange}
                  placeholder="Ex: 5000"
                />
              </div>
            </div>

            <div className="vision-progress">
              <div className="vision-stats">
                <span className="current">R$ {formData.currentCapital || '0'}</span>
                <span className="target">R$ {formData.targetCapital || '0'}</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" ref={progressBarRef}></div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: '"Courier New", Courier, monospace' }}>
                Progresso: {calculateProgress()}% concluído
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Regras Operacionais */}
        <div className="rules-card">
          <div className="card">
            <div className="card-header">
              <Shield size={20} color="#fff" />
              <h3>Parâmetros de Risco (Hard Limits)</h3>
            </div>
            
            <div className="form-row" style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Stop Diário (R$)</label>
                <input 
                  type="number" 
                  name="dailyLossLimit" 
                  value={formData.dailyLossLimit} 
                  onChange={handleChange}
                  placeholder="Máximo a perder no dia"
                />
              </div>
              <div className="form-group">
                <label>Stop Semanal (R$)</label>
                <input 
                  type="number" 
                  name="weeklyLossLimit" 
                  value={formData.weeklyLossLimit} 
                  onChange={handleChange}
                  placeholder="Máximo a perder na semana"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Meta Diária (R$)</label>
              <input 
                type="number" 
                name="dailyGoal" 
                value={formData.dailyGoal} 
                onChange={handleChange}
                placeholder="Meta conservadora diária"
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <Target size={20} color="#fff" />
              <h3>Regras de Engajamento</h3>
            </div>
            
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Nome do Setup (Seu Edge)</label>
              <input 
                type="text" 
                name="setupName" 
                value={formData.setupName} 
                onChange={handleChange}
                placeholder="Ex: Rompimento de VWAP, Pullback na MM20"
              />
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Gatilhos / Condições de Entrada</label>
              <textarea 
                name="setupTriggers" 
                value={formData.setupTriggers} 
                onChange={handleChange}
                placeholder="Descreva exatamente o que precisa acontecer para você clicar em 'Comprar' ou 'Vender'"
                rows="3"
              />
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Ativos Permitidos</label>
              <input 
                type="text" 
                name="allowedAssets" 
                value={formData.allowedAssets} 
                onChange={handleChange}
                placeholder="Ex: WINFUT, WDOFUT, PETR4"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Compromisso */}
      <div className="commitment-section">
        <div className="stamp-overlay" ref={stampRef}>EXECUTADO</div>
        
        <h3><AlertTriangle size={24} color="#fff" style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Protocolo de Execução</h3>
        <p>Ao assinar abaixo, você declara que leu suas metas, aceita seus limites de perda (hard limits) e jura operar estritamente dentro das regras de engajamento definidas. O desvio deste protocolo resultará em falha.</p>
        
        <button 
          className={`btn-sign ${isSigned ? 'signed' : ''}`}
          onClick={handleSign}
          disabled={isSigned}
        >
          {isSigned ? (
            <>PROTOCOLO ASSINADO HOJE</>
          ) : (
            <>ASSINAR PROTOCOLO TÁTICO</>
          )}
        </button>
      </div>

    </div>
  );
};

export default Plano;

import { useState, useEffect } from 'react';
import { RefreshCcw, Sun, Target, Moon, Flame, ShieldAlert } from 'lucide-react';
import { useTrades } from '../contexts/TradeContext';
import './Rotina.css';

const dayTradeTasksTemplate = {
  preMarket: [
    { id: 'dt-pre-1', text: 'Ler notícias e calendário econômico', completed: false },
    { id: 'dt-pre-2', text: 'Fazer marcações de suporte e resistência', completed: false },
    { id: 'dt-pre-3', text: 'Definir viés e cenários possíveis', completed: false },
  ],
  execution: [
    { id: 'dt-exe-1', text: 'Gatilho técnico/operacional claro?', completed: false },
    { id: 'dt-exe-2', text: 'Risco/Retorno é favorável?', completed: false },
    { id: 'dt-exe-3', text: 'Tamanho da posição respeita o limite?', completed: false },
  ],
  postMarket: [
    { id: 'dt-pos-1', text: 'Preencher o Diário e tirar prints', completed: false },
    { id: 'dt-pos-2', text: 'Desligar a plataforma (evitar overtrading)', completed: false },
  ]
};

const swingTradeTasksTemplate = {
  preMarket: [
    { id: 'st-pre-1', text: 'Analisar fechamento do IBOV e globais', completed: false },
    { id: 'st-pre-2', text: 'Monitorar as 5 Carteiras (ETFs, B3, etc.)', completed: false },
    { id: 'st-pre-3', text: 'Identificar papéis em zonas de valor', completed: false },
  ],
  execution: [
    { id: 'st-exe-1', text: 'Fundamentos da empresa continuam fortes?', completed: false },
    { id: 'st-exe-2', text: 'Tendência macro está a favor?', completed: false },
    { id: 'st-exe-3', text: 'O risco está diversificado nas carteiras?', completed: false },
  ],
  postMarket: [
    { id: 'st-pos-1', text: 'Acompanhar fatos relevantes / dividendos', completed: false },
    { id: 'st-pos-2', text: 'Ajustar stops (Trailing Stop longo)', completed: false },
  ]
};

const Rotina = () => {
  const { reminders, disciplineStreak, incrementStreak, resetStreak } = useTrades();
  const [profile, setProfile] = useState(() => localStorage.getItem('matilha_rotina_profile') || 'daytrade');
  
  // Emotional Check-in State
  const [sleepQuality, setSleepQuality] = useState(() => localStorage.getItem('matilha_sleep') || '');
  const [stressLevel, setStressLevel] = useState(() => localStorage.getItem('matilha_stress') || '');
  
  // Initialize tasks
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('matilha_rotina_tasks');
    return saved ? JSON.parse(saved) : { daytrade: dayTradeTasksTemplate, swingtrade: swingTradeTasksTemplate };
  });

  useEffect(() => {
    localStorage.setItem('matilha_rotina_profile', profile);
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('matilha_rotina_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('matilha_sleep', sleepQuality);
  }, [sleepQuality]);

  useEffect(() => {
    localStorage.setItem('matilha_stress', stressLevel);
  }, [stressLevel]);

  // Sync GOAT IA Rules into Execution checklist dynamically
  const currentTemplate = profile === 'daytrade' ? tasks.daytrade : tasks.swingtrade;
  const executionTasks = [...currentTemplate.execution];
  
  // Add AI rules that aren't already there (they don't persist in standard local storage the same way, but we track their completion via ID)
  reminders.forEach(rule => {
    const ruleId = `ai-rule-${rule.id}`;
    if (!executionTasks.find(t => t.id === ruleId)) {
      // Check if it was saved as completed in a previous render
      const savedRule = currentTemplate.execution.find(t => t.id === ruleId);
      executionTasks.push({ id: ruleId, text: `[REGRA IA] ${rule.text}`, completed: savedRule ? savedRule.completed : false, isAiRule: true });
    }
  });

  const getProgress = () => {
    const allTasks = [...currentTemplate.preMarket, ...executionTasks, ...currentTemplate.postMarket];
    if (allTasks.length === 0) return 0;
    const completed = allTasks.filter(t => t.completed).length;
    return Math.round((completed / allTasks.length) * 100);
  };

  const progress = getProgress();

  useEffect(() => {
    if (progress === 100) {
      incrementStreak();
    }
  }, [progress, incrementStreak]);

  const toggleTask = (category, taskId) => {
    setTasks(prev => {
      const newTasks = { ...prev };
      const currentProfileTasks = { ...newTasks[profile] };
      
      // Handle dynamically injected AI rules if they are toggled
      if (category === 'execution' && taskId.startsWith('ai-rule-')) {
          const ruleExists = currentProfileTasks.execution.find(t => t.id === taskId);
          if (ruleExists) {
              currentProfileTasks.execution = currentProfileTasks.execution.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
          } else {
               const ruleText = executionTasks.find(t => t.id === taskId)?.text || 'Regra IA';
               currentProfileTasks.execution = [...currentProfileTasks.execution, { id: taskId, text: ruleText, completed: true, isAiRule: true }];
          }
      } else {
          currentProfileTasks[category] = currentProfileTasks[category].map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
          );
      }
      
      newTasks[profile] = currentProfileTasks;
      return newTasks;
    });
  };

  const handleResetRoutine = () => {
    if(window.confirm(`Você lutou ${disciplineStreak} dias por essa disciplina. Vai jogar tudo no lixo por preguiça? ATENÇÃO: Se não bateu 100% ontem, seu Streak ZERA agora. Deseja mesmo continuar?`)) {
      if (progress < 100 && progress > 0) {
        resetStreak();
      }
      setTasks({ daytrade: dayTradeTasksTemplate, swingtrade: swingTradeTasksTemplate });
      setSleepQuality('');
      setStressLevel('');
    }
  };

  const renderSection = (title, icon, categoryKey, items) => (
    <div className="rotina-section">
      <div className="section-header">
        {icon}
        <h2>{title}</h2>
      </div>
      <div className="task-list">
        {items.map(task => (
          <label key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${task.isAiRule ? 'ai-rule-task' : ''}`}>
            <input 
              type="checkbox" 
              checked={task.completed}
              onChange={() => toggleTask(categoryKey, task.id)}
            />
            <span className="task-text">{task.text}</span>
            {task.isAiRule && <ShieldAlert size={14} className="ai-icon" />}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="rotina-container animate-fade-in">
      <div className="header-actions">
        <div>
          <h1>Rotina de Elite</h1>
          <p className="subtitle">Execute o processo perfeitamente. O resultado é consequência.</p>
        </div>
        
        <div className="streak-badge">
          <Flame size={24} className={disciplineStreak > 0 ? "streak-active" : "streak-inactive"} />
          <div className="streak-info">
            <span className="streak-count">{disciplineStreak}</span>
            <span className="streak-label">Dias de Foco</span>
          </div>
        </div>
      </div>
      
      <div className="profile-selector">
        <button 
          className={`profile-btn ${profile === 'daytrade' ? 'active' : ''}`}
          onClick={() => setProfile('daytrade')}
        >
          Day Trade
        </button>
        <button 
          className={`profile-btn ${profile === 'swingtrade' ? 'active' : ''}`}
          onClick={() => setProfile('swingtrade')}
        >
          Swing / Position Trade
        </button>
      </div>

      <div className="progress-container">
        <div className="progress-header">
          <span>{progress === 100 ? 'Dia Vitorioso! Disciplina 100%' : 'Disciplina do Dia'}</span>
          <span>{progress}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? 'var(--success-color, #22c55e)' : 'var(--primary-accent)' }}></div>
        </div>
      </div>

      <div className="emotional-checkin rotina-section">
        <div className="section-header">
          <h2>Check-in Emocional (Pré-Market)</h2>
        </div>
        <div className="checkin-grid">
          <div className="checkin-group">
            <label>Qualidade do Sono:</label>
            <div className="checkin-options">
              <button className={`checkin-btn ${sleepQuality === 'Boa' ? 'active-good' : ''}`} onClick={() => setSleepQuality('Boa')}>Boa</button>
              <button className={`checkin-btn ${sleepQuality === 'Média' ? 'active-avg' : ''}`} onClick={() => setSleepQuality('Média')}>Média</button>
              <button className={`checkin-btn ${sleepQuality === 'Ruim' ? 'active-bad' : ''}`} onClick={() => setSleepQuality('Ruim')}>Ruim</button>
            </div>
          </div>
          <div className="checkin-group">
            <label>Nível de Estresse:</label>
            <div className="checkin-options">
              <button className={`checkin-btn ${stressLevel === 'Baixo' ? 'active-good' : ''}`} onClick={() => setStressLevel('Baixo')}>Baixo</button>
              <button className={`checkin-btn ${stressLevel === 'Médio' ? 'active-avg' : ''}`} onClick={() => setStressLevel('Médio')}>Médio</button>
              <button className={`checkin-btn ${stressLevel === 'Alto' ? 'active-bad' : ''}`} onClick={() => setStressLevel('Alto')}>Alto</button>
            </div>
          </div>
        </div>
        
        {(sleepQuality === 'Ruim' || stressLevel === 'Alto') && (
          <div className="checkin-alert hardcore-warning">
            <Flame size={28} className="pulse-icon" />
            <div className="alert-content">
              <strong>O MERCADO VAI TIRAR SEU DINHEIRO HOJE.</strong>
              <p>Seu cérebro está lento e você está estressado. Se abrir o homebroker agora, aceite que está rasgando o dinheiro da sua família. Feche a tela ou opere com no máximo 10% da mão.</p>
            </div>
          </div>
        )}
      </div>

      <div className="rotina-grid">
        {renderSection('Pré-Market / Análise', <Sun size={24} className="icon-orange" />, 'preMarket', currentTemplate.preMarket)}
        {renderSection('Filtro Pré-Boleta (Fundamentos)', <Target size={24} className="icon-blue" />, 'execution', executionTasks)}
        {renderSection('Pós-Market / Revisão', <Moon size={24} className="icon-purple" />, 'postMarket', currentTemplate.postMarket)}
      </div>

      <div className="reset-container">
        <button className="btn-secondary" onClick={handleResetRoutine}>
          <RefreshCcw size={18} />
          Resetar Rotina (Novo Dia)
        </button>
      </div>
    </div>
  );
};

export default Rotina;

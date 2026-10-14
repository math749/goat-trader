import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Brain,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Heart,
  Zap,
  Sparkles,
  User,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Award,
  Flame,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Send,
  Coffee,
  Moon,
  Sun,
  Activity,
  TrendingDown,
  RotateCcw,
  Target,
  FileCheck
} from 'lucide-react';
import { useTrades } from '../contexts/TradeContext';
import './Psicologia.css';

// Respostas inteligentes e situacionais com o tom equilibrado e 12 anos de experiência da Amanda
const AMANDA_KNOWLEDGE_BASE = {
  violino: {
    title: "O Violino no Stop (Mercado tirou e foi pro alvo)",
    advice: "Compreendo profundamente sua frustração. Em 12 anos de pregão, já vi esse filme milhares de vezes. Mas anote isso com caneta permanente: **O stop não foi um erro, foi o custo do seguro da sua conta.** Quando o mercado te tira e vai pro alvo, seu cérebro primitivo grita que o stop foi injusto. Não caia nessa armadilha mental. Se você não tivesse o stop, um dia o mercado não voltaria e levaria 50% do seu capital. Respire fundo: seu trabalho não é ter razão em todo trade, é executar o processo com precisão cirúrgica."
  },
  medo_gatilho: {
    title: "Hesitação e Medo de Clicar",
    advice: "O medo de clicar é uma cicatriz emocional de perdas recentes mal assimiladas. Se você vê a configuração técnica do seu plano e hesita, significa que você ainda está operando com um lote que machuca seu ego ou seu bolso. Minha prescrição imediata: **reduza seu lote para o mínimo possível por 3 dias.** Tire o peso financeiro da equação e treine apenas o ato mecânico de aceitar a incerteza probabilística. Quando a mente percebe que o loss não é uma ameaça existencial, a hesitação desaparece."
  },
  devolver_lucro: {
    title: "Devolver o Lucro da Manhã à Tarde",
    advice: "Esse é o clássico 'Efeito Casa de Apostas'. Pela manhã, você operou com disciplina, o mercado deu o gain e você gerou dopamina. À tarde, a liquidez institucional cai drasticamente, o mercado fica errático e seu cérebro quer mais dopamina. Como você já está 'com o dinheiro do mercado', relaxa os filtros de risco e começa a aceitar entradas fracas. Minha regra de ouro em mesa proprietária: **Bateu a meta da manhã? Feche a plataforma às 11:30.** Operar depois disso não é trading, é gula estatística."
  },
  recuperar_confianca: {
    title: "Recuperando a Confiança Após Sequência de Loss",
    advice: "A confiança do trader não vem de dias de gain consecutivo, vem de saber que você consegue seguir regras mesmo sangrando. Uma sequência negativa de 4 ou 5 stops faz parte de qualquer sistema com 50-60% de acerto. Pare de olhar o saldo financeiro em Reais e foque em **Score de Execução:** 'Entrei no ponto certo? Stop estava no lugar? Saí onde devia?'. Se a resposta for sim, parabéns, você foi um profissional. O resultado financeiro é apenas consequência da consistência na execução."
  },
  preco_medio: {
    title: "Alerta Crítico: Preço Médio Contra a Tendência",
    advice: "Pare tudo o que você estiver fazendo. Olhe nos meus olhos: **Fazer preço médio para trás é a causa número 1 de quebra de traders em todo o planeta.** Você está transformando um erro pequeno de timing num suicídio financeiro para não ter que admitir que errou. Feche essa operação agora a mercado, aceite o prejuízo como taxa de aprendizado e levante-se da cadeira. Proteger o seu patrimônio sobrevivente é sua única obrigação neste instante."
  },
  fomo: {
    title: "FOMO - Medo de Ficar de Fora da Pernada",
    advice: "Você acabou de ver uma vela esticada de 1.000 pontos ou 20 pontos no dólar sem você, e sua mão está coçando para comprar no topo ou vender no fundo, certo? Pare. Quem compra vela esticada está fornecendo liquidez de saída para os institucionais que entraram lá embaixo. O mercado é um trem infinito: passa um a cada 10 minutos. Perder uma pernada dói zero Reais; entrar atrasado destrói sua conta e sua autoimagem."
  }
};

const SOS_CRITICAL_SCENARIOS = [
  {
    id: 'revenge',
    label: 'Tomei stop e quero me vingar (Revenge)',
    severity: 'critical',
    icon: '🔥',
    response: 'Eu conheço essa queimação no peito. É o seu ego querendo descontar no mercado a dor do stop. O mercado é impessoal, ele não tem sentimentos e vai engolir todo o seu dinheiro se você entrar na raiva. Protocolo de Choque ativado: Afaste as mãos do teclado AGORA. Você está oficialmente bloqueado por 15 minutos.'
  },
  {
    id: 'medio_perda',
    label: 'Fiz preço médio contra a tendência e tô sufocado',
    severity: 'fatal',
    icon: '🚨',
    response: 'Atenção máxima: Esse é o erro que apaga carreiras de anos em 30 minutos. Não espere o preço voltar por milagre. ZERE essa posição a mercado imediatamente. O alívio de salvar 80% do seu capital supera infinitamente a dor de aceitar esse loss. Execute a saída agora.'
  },
  {
    id: 'alavancagem',
    label: 'Alavanquei além da conta e tô suando frio',
    severity: 'critical',
    icon: '⚠️',
    response: 'Se você está com taquicardia ou suor frio, o lote está grande demais para sua capacidade psicológica atual. Você não está operando probabilidade, está apostando roleta russa. Zere pelo menos 70% da posição agora para respirar com clareza mental e conseguir gerenciar o restante com calma.'
  },
  {
    id: 'moveu_stop',
    label: 'Arrastei meu stop loss com medo de perder',
    severity: 'high',
    icon: '🛑',
    response: 'Você quebrou o pacto que fez consigo mesmo antes de entrar no trade. Quando você move o stop, você invalida toda a sua matemática de risco. Recoloque o stop no ponto técnico original ou encerre o trade. Um stop aceito é um troféu de disciplina profissional.'
  },
  {
    id: 'ganho_euforia',
    label: 'Bati a meta cedo e quero continuar clicando',
    severity: 'medium',
    icon: '🏆',
    response: 'A euforia é tão perigosa quanto o desespero. Seu cérebro está inundado de dopamina e acreditando que você previu o futuro. Esse é o momento exato em que 92% dos traders devolvem tudo até as 15h. Salve seu dia de campeão: feche o Profit/MetaTrader e vá comemorar longe do computador.'
  }
];

const Psicologia = () => {
  const { getDailyMetrics, getMetrics, trades } = useTrades();
  const [activeTab, setActiveTab] = useState('checkin'); // checkin, sos, debriefing, chat, biblioteca

  // Check-in State
  const [sono, setSono] = useState(8);
  const [estresse, setEstresse] = useState(3);
  const [foco, setFoco] = useState(8);
  const [pressao, setPressao] = useState(2);
  const [maxLoss, setMaxLoss] = useState('300');
  const [metaGain, setMetaGain] = useState('500');
  const [maxTrades, setMaxTrades] = useState('4');
  const [pactoAssinado, setPactoAssinado] = useState(() => {
    const saved = localStorage.getItem('amanda_pacto_hoje');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      const today = new Date().toLocaleDateString('pt-BR');
      return parsed.data === today ? parsed : null;
    } catch {
      return null;
    }
  });

  // SOS State
  const [sosAtivo, setSosAtivo] = useState(false);
  const [sosCenario, setSosCenario] = useState(null);
  const [timerLockdown, setTimerLockdown] = useState(0);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState('Inspire (4s)');
  const [breathCounter, setBreathCounter] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Debriefing State
  const [pnlDia, setPnlDia] = useState('');
  const [seguiuPlano, setSeguiuPlano] = useState('sim');
  const [errosCruciais, setErrosCruciais] = useState([]);
  const [errosBestas, setErrosBestas] = useState([]);
  const [notaDia, setNotaDia] = useState('');
  const [debriefingFeedback, setDebriefingFeedback] = useState(null);

  // Chat State
  const [messages, setMessages] = useState([
    {
      sender: 'amanda',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      text: 'Olá! Sou a **Amanda**, sua mentora de psicologia comportamental e risco. Passei mais de 12 anos em mesas proprietárias e já vi todo tipo de vitória e tragédia na tela. Estou aqui para te ouvir sem julgamentos, cortar o ruído emocional e garantir que você opere como um profissional consistente. Como você está se sentindo hoje?'
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const chatBottomRef = useRef(null);

  // Toca som sutil com Web Audio API
  const playZenBell = (freq = 528) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2.5);
    } catch (e) {
      // Ignora erro de áudio
    }
  };

  // Cálculo da Nota de Prontidão Mental (0 a 100%)
  const readinessScore = useMemo(() => {
    // Sono (peso 25%), Foco (peso 35%), Estresse (peso 20% invertido), Pressão (peso 20% invertido)
    const sonoScore = (sono / 10) * 25;
    const focoScore = (foco / 10) * 35;
    const estresseScore = ((10 - estresse) / 10) * 20;
    const pressaoScore = ((10 - pressao) / 10) * 20;
    return Math.round(sonoScore + focoScore + estresseScore + pressaoScore);
  }, [sono, foco, estresse, pressao]);

  // Diretriz da Amanda para o Lote do Dia
  const diretrizLote = useMemo(() => {
    if (readinessScore >= 80) {
      return {
        tipo: 'LIBERADO',
        classe: 'status-green',
        lote: 'Lote Padrão (100%)',
        parecer: 'Mente afiada e ruído emocional baixo. Você está no controle, execute o plano sem hesitar.'
      };
    } else if (readinessScore >= 60) {
      return {
        tipo: 'ATENÇÃO',
        classe: 'status-yellow',
        lote: 'Meio Lote (50%)',
        parecer: 'Detectei sinais moderados de estresse ou cansaço. Reduza o risco pela metade hoje para proteger a conta.'
      };
    } else {
      return {
        tipo: 'ALERTA MÁXIMO',
        classe: 'status-red',
        lote: 'Proibido Conta Real (0%)',
        parecer: 'Seu cérebro está em estado de fadiga ou pressão financeira extrema. Fique no simulador ou estude hoje. Proteger seu capital é a vitória de hoje.'
      };
    }
  }, [readinessScore]);

  // Timer de Lockdown do SOS
  useEffect(() => {
    let interval = null;
    if (timerLockdown > 0) {
      interval = setInterval(() => {
        setTimerLockdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerLockdown]);

  // Respiração Guiada 4-7-8
  useEffect(() => {
    if (!isBreathing) return;
    let timer;
    let sec = breathCounter;

    timer = setInterval(() => {
      sec -= 1;
      if (sec <= 0) {
        if (breathPhase.startsWith('Inspire')) {
          setBreathPhase('Segure o Ar (7s)');
          sec = 7;
          playZenBell(432);
        } else if (breathPhase.startsWith('Segure')) {
          setBreathPhase('Expire Lentamente (8s)');
          sec = 8;
          playZenBell(396);
        } else {
          setBreathPhase('Inspire (4s)');
          sec = 4;
          playZenBell(528);
        }
      }
      setBreathCounter(sec);
    }, 1000);

    return () => clearInterval(timer);
  }, [isBreathing, breathPhase, breathCounter]);

  // Scroll do chat automático
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Assinar Pacto Diário
  const handleAssinarPacto = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const novoPacto = {
      data: today,
      hora: time,
      readinessScore,
      maxLoss: parseFloat(maxLoss) || 300,
      metaGain: parseFloat(metaGain) || 500,
      maxTrades: parseInt(maxTrades, 10) || 4,
      diretriz: diretrizLote.lote
    };
    setPactoAssinado(novoPacto);
    localStorage.setItem('amanda_pacto_hoje', JSON.stringify(novoPacto));
    playZenBell(528);
  };

  // Disparar SOS
  const handleTriggerSOS = (cenario) => {
    setSosCenario(cenario);
    setSosAtivo(true);
    setTimerLockdown(15 * 60); // 15 minutos de lockdown
    setIsBreathing(true);
    setBreathPhase('Inspire (4s)');
    setBreathCounter(4);
    playZenBell(396);

    // Adiciona na conversa com a Amanda
    setMessages(prev => [
      ...prev,
      {
        sender: 'user',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        text: `🚨 SOS ATIVADO: ${cenario.label}`
      },
      {
        sender: 'amanda',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        text: cenario.response
      }
    ]);
  };

  // Enviar mensagem no chat
  const handleSendChat = (textToSend = null) => {
    const msg = textToSend || inputMsg;
    if (!msg.trim()) return;

    const userTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newMsgObj = { sender: 'user', time: userTime, text: msg };
    setMessages(prev => [...prev, newMsgObj]);
    setInputMsg('');

    // Gera resposta da Amanda baseada em palavras-chave e inteligência contextual
    setTimeout(() => {
      let reply = "";
      const lower = msg.toLowerCase();

      if (lower.includes('stop') && (lower.includes('violino') || lower.includes('voltou') || lower.includes('alvo'))) {
        reply = AMANDA_KNOWLEDGE_BASE.violino.advice;
      } else if (lower.includes('medo') || lower.includes('hesitei') || lower.includes('hesitacao') || lower.includes('clicar')) {
        reply = AMANDA_KNOWLEDGE_BASE.medo_gatilho.advice;
      } else if (lower.includes('devolver') || lower.includes('tarde') || lower.includes('bater meta')) {
        reply = AMANDA_KNOWLEDGE_BASE.devolver_lucro.advice;
      } else if (lower.includes('confiança') || lower.includes('perdendo') || lower.includes('sequencia') || lower.includes('loss')) {
        reply = AMANDA_KNOWLEDGE_BASE.recuperar_confianca.advice;
      } else if (lower.includes('médio') || lower.includes('medio') || lower.includes('dobrar')) {
        reply = AMANDA_KNOWLEDGE_BASE.preco_medio.advice;
      } else if (lower.includes('fomo') || lower.includes('perdi') || lower.includes('fora')) {
        reply = AMANDA_KNOWLEDGE_BASE.fomo.advice;
      } else {
        reply = `Estou te ouvindo com atenção total. Como mentora, garanto: **o que você está sentindo agora não é exclusivo seu, é a biologia humana reagindo à incerteza do mercado.**

Para te ajudar cirurgicamente, me diga:
1. Esse incômodo vem de uma perda financeira ou da frustração de ter quebrado seu plano?
2. Você está com alguma posição aberta neste exato instante?

Respire fundo. Não tome nenhuma decisão precipitada enquanto conversamos. Estou com você.`;
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'amanda',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          text: reply
        }
      ]);
      playZenBell(528);
    }, 600);
  };

  // Concluir Debriefing
  const handleFinalizarDebriefing = () => {
    const pnlNum = parseFloat(pnlDia.replace(',', '.')) || 0;
    const teveErrosCruciais = errosCruciais.length > 0;
    const seguiu = seguiuPlano === 'sim';

    let parecer = "";
    if (seguiu && !teveErrosCruciais) {
      parecer = `Parabéns pela postura impecável! Mesmo que o saldo financeiro tenha sido positivo ou negativo (R$ ${pnlNum.toFixed(2)}), **você venceu o dia porque venceu a si mesmo.** Seguir as regras sob a pressão do mercado é o que separa 5% dos consistentes de 95% dos quebrados. Desligue os monitores e vá descansar com a mente leve.`;
    } else if (teveErrosCruciais) {
      parecer = `Identifiquei que hoje você cometeu erros de alta gravidade (${errosCruciais.join(', ')}). Não quero que você se culpe ou se chicoteie mentalmente — culpa gera mais raiva, que gera mais vingança amanhã. O que precisamos é de **autopsia fria**: por que você quebrou o plano? Aceite a dor desse resultado hoje e use-a como escudo protetor para amanhã. O pregão de hoje está encerrado.`;
    } else {
      parecer = `Você teve um dia de desvios operacionais menores (${errosBestas.join(', ')}). Pequenos vazamentos afundam grandes navios. Anote o gatilho desses erros no seu diário para não repeti-los amanhã. Boa noite e descanse a mente.`;
    }

    setDebriefingFeedback(parecer);
    playZenBell(528);
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="amanda-container">
      {/* HEADER DA ESPECIALISTA */}
      <div className="amanda-header-card">
        <div className="amanda-profile-side">
          <div className="amanda-avatar-wrapper">
            <div className="amanda-avatar">
              <Brain size={36} color="#38bdf8" />
            </div>
            <span className="pulse-indicator" title="Amanda Online"></span>
          </div>

          <div className="amanda-details">
            <div className="amanda-name-row">
              <h2>Amanda Vance</h2>
              <span className="badge-expert">
                <Award size={13} /> 12+ ANOS DE MESA
              </span>
            </div>
            <p className="amanda-role">
              Especialista Sênior em Psicologia Comportamental & Risco Institucional
            </p>
            <p className="amanda-quote">
              "O mercado não tem emoções. A única pessoa que você precisa dominar entre a abertura e o fechamento é você mesmo."
            </p>
          </div>
        </div>

        <div className="amanda-quick-stats">
          <div className="stat-pill">
            <Activity size={16} color="#38bdf8" />
            <div>
              <span className="stat-num">{readinessScore}%</span>
              <span className="stat-label">Sua Prontidão Mental</span>
            </div>
          </div>

          <button 
            className="sos-direct-btn"
            onClick={() => { setActiveTab('sos'); playZenBell(396); }}
          >
            <AlertOctagon size={18} />
            <span>SOS ANTI-TILT</span>
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE OS MÓDULOS DE ATENDIMENTO */}
      <div className="amanda-tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'checkin' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkin')}
        >
          <Sun size={17} /> 1. Check-in Pré-Mercado
          {pactoAssinado && <span className="tab-badge-ok">✓ Pacto Feito</span>}
        </button>

        <button
          className={`tab-btn ${activeTab === 'sos' ? 'active danger' : ''}`}
          onClick={() => setActiveTab('sos')}
        >
          <AlertOctagon size={17} /> 2. SOS Anti-Tilt & Pânico
        </button>

        <button
          className={`tab-btn ${activeTab === 'debriefing' ? 'active' : ''}`}
          onClick={() => setActiveTab('debriefing')}
        >
          <Moon size={17} /> 3. Debriefing Noturno
        </button>

        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageCircle size={17} /> 4. Sessão com Amanda
        </button>

        <button
          className={`tab-btn ${activeTab === 'biblioteca' ? 'active' : ''}`}
          onClick={() => setActiveTab('biblioteca')}
        >
          <Sparkles size={17} /> 5. Erros Cruciais vs Bestas
        </button>
      </div>

      {/* ============================================================ */}
      {/* ABA 1: CHECK-IN PRÉ-MERCADO                                  */}
      {/* ============================================================ */}
      {activeTab === 'checkin' && (
        <div className="tab-content-panel">
          <div className="panel-title-row">
            <div>
              <h3><Sun size={22} color="#fbbf24" /> Briefing Pré-Mercado com Amanda</h3>
              <p>Antes de colocar 1 centavo em risco, calibramos sua clareza mental e travamos o risco diário.</p>
            </div>
            {pactoAssinado && (
              <div className="signed-stamp">
                <FileCheck size={18} color="#10b981" />
                <span>PACTO ASSINADO HOJE ÀS {pactoAssinado.hora}</span>
              </div>
            )}
          </div>

          <div className="checkin-grid">
            {/* Sliders de Prontidão */}
            <div className="sliders-card">
              <h4>Medidores Biológicos & Emocionais</h4>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span>💤 Qualidade do Sono:</span>
                  <strong className={sono < 6 ? 'warn' : ''}>{sono}/10 ({sono >= 7 ? 'Descansado' : 'Fadiga'})</strong>
                </div>
                <input 
                  type="range" min="1" max="10" value={sono} 
                  onChange={e => setSono(parseInt(e.target.value, 10))} 
                />
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span>⚡ Nível de Estresse Externo (fora do mercado):</span>
                  <strong className={estresse > 6 ? 'warn' : ''}>{estresse}/10 ({estresse <= 4 ? 'Tranquilo' : 'Preocupado'})</strong>
                </div>
                <input 
                  type="range" min="1" max="10" value={estresse} 
                  onChange={e => setEstresse(parseInt(e.target.value, 10))} 
                />
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span>🎯 Foco & Atenção Exclusiva:</span>
                  <strong className={foco < 6 ? 'warn' : ''}>{foco}/10 ({foco >= 7 ? 'Hiperfocado' : 'Distraído'})</strong>
                </div>
                <input 
                  type="range" min="1" max="10" value={foco} 
                  onChange={e => setFoco(parseInt(e.target.value, 10))} 
                />
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span>💓 Pressão / Necessidade de Ganhar Hoje:</span>
                  <strong className={pressao > 5 ? 'warn' : ''}>{pressao}/10 ({pressao <= 3 ? 'Desapego' : 'Urgência Financeira'})</strong>
                </div>
                <input 
                  type="range" min="1" max="10" value={pressao} 
                  onChange={e => setPressao(parseInt(e.target.value, 10))} 
                />
              </div>
            </div>

            {/* Diagnóstico da Amanda */}
            <div className="verdict-card">
              <h4>Diagnóstico de Prontidão</h4>
              
              <div className="gauge-box">
                <div className="gauge-score" style={{
                  color: readinessScore >= 80 ? '#10b981' : (readinessScore >= 60 ? '#f59e0b' : '#ef4444')
                }}>
                  {readinessScore}%
                </div>
                <span className="gauge-title">ÍNDICE DE PRONTIDÃO COGNITIVA</span>
              </div>

              <div className={`recommendation-pill ${diretrizLote.classe}`}>
                <strong>DIRETRIZ DA AMANDA:</strong> {diretrizLote.lote}
              </div>

              <p className="amanda-feedback-text">
                "{diretrizLote.parecer}"
              </p>
            </div>
          </div>

          {/* O PACTO INQUEBRÁVEL DO DIA */}
          <div className="pacto-card">
            <h4><Shield size={20} color="#38bdf8" /> O Pacto de Disciplina do Dia</h4>
            <p>Em mesa proprietária, trader sem limites definidos é retirado da sala. Estabeleça suas travas antes de ligar a tela:</p>

            <div className="pacto-inputs-grid">
              <div className="input-box">
                <label>Stop Loss Máximo Diário (R$)</label>
                <input 
                  type="number" 
                  value={maxLoss} 
                  onChange={e => setMaxLoss(e.target.value)} 
                  placeholder="Ex: 300"
                />
                <span className="input-tip">Atingiu esse valor? Desliga a tela sem choro.</span>
              </div>

              <div className="input-box">
                <label>Meta de Ganho Realista (R$)</label>
                <input 
                  type="number" 
                  value={metaGain} 
                  onChange={e => setMetaGain(e.target.value)} 
                  placeholder="Ex: 500"
                />
                <span className="input-tip">Bateu a meta? Proteja o ganho e vá viver.</span>
              </div>

              <div className="input-box">
                <label>Máximo de Operações no Dia</label>
                <input 
                  type="number" 
                  value={maxTrades} 
                  onChange={e => setMaxTrades(e.target.value)} 
                  placeholder="Ex: 4"
                />
                <span className="input-tip">Overtrading é sintoma de vício em cliques.</span>
              </div>
            </div>

            <button 
              className="sign-pact-btn"
              onClick={handleAssinarPacto}
            >
              <CheckCircle2 size={20} />
              <span>Assinar Pacto de Disciplina com a Amanda</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 2: SOS ANTI-TILT & PÂNICO IMEDIATO                       */}
      {/* ============================================================ */}
      {activeTab === 'sos' && (
        <div className="tab-content-panel sos-panel">
          <div className="panel-title-row">
            <div>
              <h3 style={{ color: '#ef4444' }}>
                <AlertOctagon size={24} color="#ef4444" /> Central de Intervenção de Choque Anti-Tilt
              </h3>
              <p>Sentiu raiva, medo paralisante ou impulso de vingança? Clique no seu sintoma agora e deixe a Amanda assumir o comando.</p>
            </div>

            <button 
              className="sound-toggle-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Desativar Sino Zen" : "Ativar Sino Zen"}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>

          {/* Botões Rápidos de Erros em Curso */}
          <div className="sos-scenarios-grid">
            {SOS_CRITICAL_SCENARIOS.map(cenario => (
              <button
                key={cenario.id}
                className={`sos-btn-scenario ${cenario.severity} ${sosCenario?.id === cenario.id ? 'selected' : ''}`}
                onClick={() => handleTriggerSOS(cenario)}
              >
                <span className="scenario-icon">{cenario.icon}</span>
                <span className="scenario-text">{cenario.label}</span>
              </button>
            ))}
          </div>

          {/* PAINEL DE INTERVENÇÃO ATIVA */}
          {sosAtivo && sosCenario && (
            <div className="sos-active-rescue">
              <div className="rescue-header">
                <div className="badge-intervencao">🚨 INTERVENÇÃO IMEDIATA DA AMANDA</div>
                <div className="lockdown-timer">
                  <Clock size={16} /> MÃOS LONGE DO TECLADO: <strong>{formatSeconds(timerLockdown)}</strong>
                </div>
              </div>

              <div className="rescue-body">
                <p className="amanda-rescue-speech">
                  "{sosCenario.response}"
                </p>

                {/* Exercício de Respiração Tática Guiada 4-7-8 */}
                <div className="tactical-breathing-box">
                  <div className="breathing-circle-wrapper">
                    <div className={`breathing-circle ${breathPhase.startsWith('Inspire') ? 'expand' : (breathPhase.startsWith('Segure') ? 'hold' : 'shrink')}`}>
                      <span className="phase-text">{breathPhase}</span>
                      <span className="counter-num">{breathCounter}</span>
                    </div>
                  </div>

                  <div className="breathing-instructions">
                    <h5>Respiração Tática 4-7-8 (Redução de Cortisol)</h5>
                    <p>
                      Quando você toma um stop violento, a amígdala cerebral sequestra o córtex pré-frontal e desliga a razão. 
                      Essa respiração força sua frequência cardíaca a desacelerar em menos de 90 segundos.
                    </p>
                    <button 
                      className="restart-breath-btn"
                      onClick={() => { setIsBreathing(true); setBreathPhase('Inspire (4s)'); setBreathCounter(4); }}
                    >
                      <RotateCcw size={15} /> Reiniciar Ciclo Respiratório
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 3: DEBRIEFING NOTURNO                                    */}
      {/* ============================================================ */}
      {activeTab === 'debriefing' && (
        <div className="tab-content-panel">
          <div className="panel-title-row">
            <div>
              <h3><Moon size={22} color="#c084fc" /> Fechamento do Pregão com Amanda</h3>
              <p>O mercado fechou. Agora é hora de descompressão, aprendizado frio e desligar a mente para viver sua vida.</p>
            </div>
          </div>

          <div className="debriefing-grid">
            <div className="debriefing-form">
              <div className="form-row">
                <label>Resultado Financeiro Líquido do Dia (R$)</label>
                <input 
                  type="text" 
                  value={pnlDia} 
                  onChange={e => setPnlDia(e.target.value)} 
                  placeholder="Ex: +450,00 ou -200,00"
                />
              </div>

              <div className="form-row">
                <label>Você seguiu o Plano e o Stop do Pacto hoje?</label>
                <div className="radio-pills">
                  <button 
                    className={`pill-btn ${seguiuPlano === 'sim' ? 'active' : ''}`}
                    onClick={() => setSeguiuPlano('sim')}
                  >
                    🟢 Sim, 100% à risca
                  </button>
                  <button 
                    className={`pill-btn ${seguiuPlano === 'parcial' ? 'active' : ''}`}
                    onClick={() => setSeguiuPlano('parcial')}
                  >
                    🟡 Parcialmente
                  </button>
                  <button 
                    className={`pill-btn ${seguiuPlano === 'nao' ? 'active' : ''}`}
                    onClick={() => setSeguiuPlano('nao')}
                  >
                    🔴 Não, quebrei as regras
                  </button>
                </div>
              </div>

              {/* Seleção de Erros Cruciais */}
              <div className="form-row">
                <label className="label-danger">Erros Cruciais Cometidos (Que quebram contas):</label>
                <div className="checkbox-tags">
                  {[
                    'Fiz preço médio na perda',
                    'Movi ou tirei o stop loss',
                    'Alavanquei acima da gestão',
                    'Tentei me vingar após loss'
                  ].map(erro => (
                    <button
                      key={erro}
                      className={`tag-btn danger ${errosCruciais.includes(erro) ? 'checked' : ''}`}
                      onClick={() => {
                        setErrosCruciais(prev => 
                          prev.includes(erro) ? prev.filter(e => e !== erro) : [...prev, erro]
                        );
                      }}
                    >
                      {errosCruciais.includes(erro) ? '✓ ' : '+ '} {erro}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seleção de Erros Bestas */}
              <div className="form-row">
                <label className="label-warning">Erros Bestas Cometidos (Que sangram o lucro):</label>
                <div className="checkbox-tags">
                  {[
                    'Operei por tédio/ansiedade',
                    'Operei no horário do almoço',
                    'Antecipei sinal antes do candle fechar',
                    'Fiquei olhando o celular operando'
                  ].map(erro => (
                    <button
                      key={erro}
                      className={`tag-btn warning ${errosBestas.includes(erro) ? 'checked' : ''}`}
                      onClick={() => {
                        setErrosBestas(prev => 
                          prev.includes(erro) ? prev.filter(e => e !== erro) : [...prev, erro]
                        );
                      }}
                    >
                      {errosBestas.includes(erro) ? '✓ ' : '+ '} {erro}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                className="finish-debriefing-btn"
                onClick={handleFinalizarDebriefing}
              >
                <CheckCircle2 size={18} />
                <span>Receber Análise de Fechamento da Amanda</span>
              </button>
            </div>

            {/* Parecer de Fechamento */}
            <div className="debriefing-result-card">
              <h4>Veredito Noturno da Amanda</h4>
              {debriefingFeedback ? (
                <div className="feedback-content">
                  <p className="speech-quote">"{debriefingFeedback}"</p>
                  <div className="post-market-ritual">
                    <h5>RITUAL DE DESCONEXÃO:</h5>
                    <ul>
                      <li>✓ Feche todas as janelas do Profit / MT5</li>
                      <li>✓ Não assista vídeos de trade no YouTube hoje à noite</li>
                      <li>✓ Dê uma caminhada ou faça atividade física</li>
                      <li>✓ Lembre-se: amanhã é uma folha em branco</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="feedback-placeholder">
                  <Moon size={40} color="#64748b" />
                  <p>Preencha os dados do dia ao lado para receber seu feedback disciplinar e fechar sua mente para a noite.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 4: SESSÃO / CHAT COM AMANDA                              */}
      {/* ============================================================ */}
      {activeTab === 'chat' && (
        <div className="tab-content-panel chat-panel">
          <div className="chat-messages-scroll">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble ${m.sender}`}>
                <div className="bubble-author">
                  {m.sender === 'amanda' ? (
                    <span className="author-name amanda">
                      <Brain size={13} /> Amanda Vance • {m.time}
                    </span>
                  ) : (
                    <span className="author-name user">
                      Você • {m.time}
                    </span>
                  )}
                </div>
                <div className="bubble-text">
                  {m.text.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Sugestões Rápidas de Diálogo */}
          <div className="quick-prompts-row">
            <button onClick={() => handleSendChat("Tomei violinada no stop e o mercado foi pro meu alvo. Tô com raiva!")}>
              🎯 Levei violinada no stop
            </button>
            <button onClick={() => handleSendChat("Tô com medo de clicar mesmo vendo a entrada técnica.")}>
              🛑 Medo de puxar o gatilho
            </button>
            <button onClick={() => handleSendChat("Como paro de devolver à tarde o lucro que fiz de manhã?")}>
              💰 Devolvo o ganho à tarde
            </button>
            <button onClick={() => handleSendChat("Perdi a confiança depois de tomar 4 stops seguidos.")}>
              📉 Sequência ruim de perdas
            </button>
          </div>

          {/* Barra de Envio */}
          <div className="chat-input-bar">
            <input 
              type="text" 
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()}
              placeholder="Desabafe ou pergunte para a Amanda (ex: 'Fiz preço médio e tô com medo')..."
            />
            <button onClick={() => handleSendChat()} className="send-btn">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 5: BIBLIOTECA DE ERROS CRUCIAIS VS BESTAS               */}
      {/* ============================================================ */}
      {activeTab === 'biblioteca' && (
        <div className="tab-content-panel">
          <div className="panel-title-row">
            <div>
              <h3><Sparkles size={22} color="#38bdf8" /> Dicionário de Sobrevivência da Amanda</h3>
              <p>12 anos de experiência condensados nos dois grupos de erros que destroem o trader.</p>
            </div>
          </div>

          <div className="library-split">
            {/* Erros Cruciais */}
            <div className="library-card fatal-card">
              <h4><AlertOctagon size={20} color="#ef4444" /> Erros Cruciais (Quebram Contas)</h4>
              <p className="card-sub">Erros que causam ruína matemática imediata. Tolerância zero.</p>

              <div className="error-item">
                <h5>1. Preço Médio Contra a Tendência</h5>
                <p>Aumentar lote em trade perdedor na esperança de que o preço volte ao preço de equilíbrio.</p>
                <div className="antidoto">
                  <strong>Antídoto da Amanda:</strong> Se a tese inicial falhou no stop, o trade está morto. Pague o funeral e procure o próximo ativo.
                </div>
              </div>

              <div className="error-item">
                <h5>2. Mover o Stop Loss para Longe</h5>
                <p>Arrastar a ordem de stop quando o mercado se aproxima por recusa em aceitar o loss.</p>
                <div className="antidoto">
                  <strong>Antídoto da Amanda:</strong> O stop loss é o custo operacional do seu negócio, assim como aluguel e luz. Aceite-o como empresário.
                </div>
              </div>

              <div className="error-item">
                <h5>3. Revenge Trading (Operar com Raiva)</h5>
                <p>Abrir ordens imediatas logo após um loss para 'pegar o dinheiro de volta'.</p>
                <div className="antidoto">
                  <strong>Antídoto da Amanda:</strong> Levante-se por 15 minutos. O mercado não sabe seu nome e não te deve nada.
                </div>
              </div>
            </div>

            {/* Erros Bestas */}
            <div className="library-card silly-card">
              <h4><AlertTriangle size={20} color="#f59e0b" /> Erros Bestas (Sangram o Lucro)</h4>
              <p className="card-sub">Erros de indisciplina diária que corroem seu ganho centavo por centavo.</p>

              <div className="error-item">
                <h5>1. Clicar por Tédio (Boredom Trading)</h5>
                <p>Operar só porque o mercado está aberto e você 'não quer ficar parado'.</p>
                <div className="antidoto">
                  <strong>Antídoto da Amanda:</strong> 90% do trabalho do trader é esperar como um atirador de elite. Estar líquido é estar posicionado.
                </div>
              </div>

              <div className="error-item">
                <h5>2. Operar no Horário do Almoço (12h - 14h)</h5>
                <p>Tentar caçar rompimentos quando os grandes bancos e fundos estão fora da mesa.</p>
                <div className="antidoto">
                  <strong>Antídoto da Amanda:</strong> Sem volume institucional, o mercado fica travado em falso rompimento. Almoce longe da tela.
                </div>
              </div>

              <div className="error-item">
                <h5>3. Antecipar Fechamento de Candle</h5>
                <p>Entrar antes do tempo gráfico confirmar para 'pegar um preço melhor'.</p>
                <div className="antidoto">
                  <strong>Antídoto da Amanda:</strong> Um candle só existe quando fecha. Antes disso, é apenas imaginação e ansiedade.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Psicologia;
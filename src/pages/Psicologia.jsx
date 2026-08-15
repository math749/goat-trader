import {
  Brain,
  Zap,
  Heart,
  Shield,
  Activity,
  TrendingUp,
  TrendingDown,
  Moon
} from 'lucide-react';
import './Psicologia.css';

const Psicologia = () => {
  return (
    <div className="psicologia-container">
      <div className="page-header">
        <h2><Brain size={24} color="var(--primary-accent)" /> Psicologia do Trader</h2>
        <p>Desenvolva a mentalidade vencedora para operar com consistência e disciplina.</p>
      </div>

      <div className="psicologia-grid">
        {/* Left Column: Conceitos */}
        <div className="tactic-panel">
          <h3><Zap size={20} color="var(--primary-accent)" /> O Que é Psicologia do Trader?</h3>
          <p>Psicologia do trader é o estudo das emoções, vieses cognitivos e padrões de comportamento que afetam suas decisões de trading. Mesmo a melhor estratégia falha se você não controlar a mente.</p>

          <div className="psicologia-card">
            <h4>Três Pilares da Mentalidade Vincente</h4>
            <ul style={{ paddingLeft: '1.2rem' }}>
              <li><strong>Autoconhecimento:</strong> Entenda seus gatilhos emocionais e vieses pessoais.</li>
              <li><strong>Disciplina:</strong> Siga seu plano independentemente dos resultados momentâneos.</li>
              <li><strong>Resiliência:</strong> Aprenda com os losses sem culpar-se ou buscar vingança no mercado.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Vieses Cognitivos */}
        <div className="tactic-panel">
          <h3><Heart size={20} color="var(--primary-accent)" /> Principais Vieses Cognitivos</h3>
          <p>Estes são os erros de pensamento mais comuns que levam a decisões irracionais.</p>

          <div className="bias-list">
            <div className="bias-item">
              <h5>Viés de Confirmação</h5>
              <p>Tendência a buscar informações que confirmam suas crenças existentes e ignorar evidências contrárias.</p>
              <p className="dica"><strong>Antídoto:</strong> Ativamente busque opiniões que desafiam sua visão antes de entrar em um trade.</p>
            </div>

            <div className="bias-item">
              <h5>Aversão à Perda</h5>
              <p>A dor de perder é psicologicamente duas vezes maior que o prazer de ganhar igual valor.</p>
              <p className="dica"><strong>Antídoto:</strong> Defina stop loss antes de entrar e trate-o como parte do plano, não como falha pessoal.</p>
            </div>

            <div className="bias-item">
              <h5>Viés de Recência</h5>
              <p>Dar demasiada importância a eventos recentes, achando que uma sequência de wins ou losses continuará indefinidamente.</p>
              <p className="dica"><strong>Antídoto:</strong> Mantenha um registro de trades (diário) para ver o quadro estatístico completo.</p>
            </div>

            <div className="bias-item">
              <h5>Viés de Superconfiança</h5>
              <p>Após alguns wins, sentir-se invencível e aumentar o risco desproporcionalmente.</p>
              <p className="dica"><strong>Antídoto:</strong> Revise seu plano de risco após cada sequência de wins.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Exercícios */}
      <div className="tactic-panel" style={{ marginTop: '2rem' }}>
        <h3><Activity size={24} color="var(--primary-accent)" /> Exercícios Diários para Fortalecer a Mente</h3>
        <p>Assim como um atleta treina o corpo, o trader deve treinar a mente.</p>

        <div className="exercicios-grid">
          <div className="exercicio-card">
            <h4><Moon size={18} color="var(--primary-accent)" /> Pré-Market (5 min)</h4>
            <ul>

              <li>Revise seu plano de trading</li>
              <li>Faça um check-in emocional: Como você está se sentindo hoje?</li>
              <li>Defina uma intenção para o dia (ex: "Vou seguir meu stop loss a risca")</li>
            </ul>
          </div>

          <div className="exercicio-card">
            <h4><TrendingUp size={18} color="var(--primary-accent)" /> Pós-Trade (Imediato)</h4>
            <ul>
              <li>Anote imediatamente o que sentiu durante o trade</li>
              <li>Marque a tag comportamental correspondente no seu diário</li>
              <li>Se errou, escreva o que fará diferente da próxima vez</li>
            </ul>
          </div>

          <div className="exercicio-card">
            <h4><TrendingDown size={18} color="var(--primary-accent)" /> Revisão Semanal (15 min)</h4>
            <ul>
              <li>Analise seu diário da semana</li>
              <li>Identifique padrões emocionais recorrentes</li>
              <li>Ajuste seu plano baseado em evidências, não em emoções</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Seção de Recursos */}
      <div className="tactic-panel" style={{ marginTop: '2rem' }}>
        <h3><Shield size={24} color="var(--primary-accent)" /> Recursos Recomendados</h3>
        <p>Livros, cursos e ferramentas para aprofundar seu estudo da psicologia do trading.</p>

        <div className="recursos-list">
          <div className="recurso-item">
            <h4>Livros Essenciais</h4>
            <ul>
              <li>"Trading in the Zone" - Mark Douglas</li>
              <li>"The Psychology of Trading" - Brett Steenbarger</li>
              <li>"Mind Over Markets" - James Dalton</li>
              <li>"Reminiscences of a Stock Operator" - Edwin Lefèvre</li>
            </ul>
          </div>

          <div className="recurso-item">
            <h4>Práticas Diárias</h4>
            <ul>
              <li>Meditação de 5-10 minutos antes de operar</li>
              <li>Journaling emocional (nosso diário já ajuda com isso)</li>
              <li>Revisão fria das trades sem olhar o P&L inicialmente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Psicologia;
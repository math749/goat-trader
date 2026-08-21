import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import './Termos.css';

const Termos = () => {
  return (
    <div className="termos-container">
      <div className="termos-content">
        <div className="termos-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <ShieldCheck size={32} color="#38bdf8" />
            <h1 className="termos-title">Termos de Uso & Política de Privacidade</h1>
          </div>
          <p className="termos-subtitle">Última atualização: {new Date().toLocaleDateString('pt-BR')} • Versão 1.0 (Conforme LGPD)</p>
        </div>

        <div className="termos-highlight">
          <p>⚠️ AVISO LEGAL IMPORTANTE (ISENÇÃO DE RESPONSABILIDADE CVM/ANBIMA): O GOAT TRADER é uma plataforma analítica, de diário de bordo e gerenciamento estatístico de risco. NÃO fornecemos recomendações de compra/venda de ativos, consultoria financeira ou análise de valores mobiliários.</p>
        </div>

        <div className="termos-section">
          <h3>1. Aceitação dos Termos</h3>
          <p>Ao criar uma conta ou utilizar a plataforma <strong>GOAT TRADER</strong>, você concorda expressamente em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Caso você não concorde com qualquer um destes termos, fica proibido de utilizar ou acessar este site.</p>
        </div>

        <div className="termos-section">
          <h3>2. Natureza dos Serviços & Licença de Uso</h3>
          <p>O GOAT TRADER concede ao usuário uma licença pessoal, não exclusiva e intransferível para acessar a plataforma SaaS com finalidade de estatística pessoal, registro de operações e automação de regras de risco.</p>
          <ul>
            <li>As operações no mercado financeiro (Day Trade, Swing Trade, Opções, Criptoativos) envolvem alto risco de perda de capital.</li>
            <li>O usuário é o único responsável por suas decisões operacionais executadas nas corretoras de valores.</li>
            <li>A plataforma não se responsabiliza por perdas financeiras resultantes do uso do sistema ou falhas de terceiros.</li>
          </ul>
        </div>

        <div className="termos-section">
          <h3>3. Privacidade e Proteção de Dados (LGPD)</h3>
          <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018):</p>
          <ul>
            <li><strong>Dados Coletados:</strong> Nome, e-mail, registros de trades e métricas operacionais para fins exclusivos de prestação do serviço.</li>
            <li><strong>Segurança:</strong> Seus dados de trades são protegidos por Row Level Security (RLS) e isolados por usuário.</li>
            <li><strong>Não Compartilhamento:</strong> O GOAT TRADER não vende, aluga ou compartilha seus dados operacionais com terceiros ou corretoras.</li>
          </ul>
        </div>

        <div className="termos-section">
          <h3>4. Política de Devolução & Garantia de 7 Dias (CDC Art. 49)</h3>
          <p>Oferecemos garantia de satisfação incondicional para novos assinantes do Plano GOAT PRO & QUANT:</p>
          <ul>
            <li><strong>Direito de Arrependimento:</strong> Em conformidade com o Artigo 49 do Código de Defesa do Consumidor, você pode solicitar o cancelamento e reembolso integral de 100% do valor pago em até <strong>7 (sete) dias corridos</strong> após a contratação.</li>
            <li><strong>Estorno Simplificado:</strong> Para assinaturas pagas via PIX ou Cartão no Mercado Pago, o reembolso é processado na mesma modalidade de pagamento em até 24 horas úteis sem taxas adicionais.</li>
            <li><strong>Cancelamento sem Multa:</strong> Não há fidelidade obrigatória. Você pode cancelar a renovação da sua assinatura mensal a qualquer momento sem qualquer tipo de multa ou penalidade.</li>
          </ul>
        </div>

        <div className="termos-section">
          <h3>5. Política de Conta do Usuário & Teste VIP de 5 Dias</h3>
          <ul>
            <li><strong>Plano Starter Gratuito:</strong> O registro de trades e importação de relatórios do ProfitChart/MT5 são 100% gratuitos e ilimitados.</li>
            <li><strong>5 Dias de Teste VIP:</strong> Todo novo usuário cadastrado recebe 5 dias corridos de degustação gratuita dos recursos avançados de IA (GOAT IA 2.5, FinGPT e Trava de Risco).</li>
            <li><strong>Uso Responsável:</strong> É proibido compartilhar credenciais de acesso com terceiros, tentar realizar engenharia reversa dos algoritmos ou utilizar robôs maliciosos na plataforma.</li>
          </ul>
        </div>

        <div className="termos-section">
          <h3>6. Direitos de Propriedade Intelectual</h3>
          <p>Todo o código-fonte, algoritmos de inteligência artificial (FinGPT, FinRobot), marcas, logos e interfaces visuais do GOAT TRADER são de propriedade exclusiva dos seus desenvolvedores e protegidos por leis internacionais de direitos autorais.</p>
        </div>

        <div className="termos-footer">
          <Link to="/" className="back-link">
            <ArrowLeft size={18} /> Voltar para a Página Inicial
          </Link>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>GOAT TRADER PRO © {new Date().getFullYear()} — Todos os direitos reservados.</span>
        </div>
      </div>
    </div>
  );
};

export default Termos;

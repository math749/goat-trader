/**
 * GOAT TRADER — Serviço de Gestão do Teste Grátis de 5 Dias (5-Day VIP Trial)
 */

const TRIAL_DAYS = 5;
const ADMIN_EMAILS = ['matheusben749@gmail.com', 'admin@goattrader.com'];

/**
 * Verifica se o usuário é o Administrador Principal
 */
export const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin === true || user.role === 'admin') return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim())) return true;
  return false;
};

/**
 * Calcula os dias e horas restantes do teste grátis VIP
 */
export const getTrialStatus = (user) => {
  if (!user) {
    return { isTrial: false, isExpired: false, daysLeft: 0, hoursLeft: 0, isPro: false, isAdmin: false };
  }

  // Administrador Master tem acesso total e permanente ilimitado
  if (isAdminUser(user)) {
    return { isTrial: false, isExpired: false, daysLeft: 999, hoursLeft: 24, isPro: true, isAdmin: true };
  }

  // Se o usuário tem assinatura ativa (pro / active)
  if (user.subscription_status === 'active' || user.is_pro === true) {
    return { isTrial: false, isExpired: false, daysLeft: 0, hoursLeft: 0, isPro: true, isAdmin: false };
  }

  const createdAt = user.created_at ? new Date(user.created_at) : new Date();
  const trialEndDate = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();

  const diffMs = trialEndDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      isTrial: true,
      isExpired: true,
      daysLeft: 0,
      hoursLeft: 0,
      isPro: false,
      trialEndDate
    };
  }

  const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return {
    isTrial: true,
    isExpired: false,
    daysLeft,
    hoursLeft,
    isPro: false,
    trialEndDate
  };
};

/**
 * Preço Oficial Recomendado para o Plano Único
 */
export const PRICING_CONFIG = {
  planName: 'GOAT PRO & QUANT',
  monthlyPrice: 47.00,
  monthlyFormatted: 'R$ 47,00',
  annualPrice: 397.00,
  annualFormatted: 'R$ 397,00',
  trialDays: 5,
  asaasCheckoutUrl: 'https://www.asaas.com', // Substituir pelo link real após cadastro Asaas
};

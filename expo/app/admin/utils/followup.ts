import type { QuoteInput, Language } from '@/types/intake';
import { getRequiredMissing, getIntakeStatus } from '@/utils/quoteReadiness';

export interface FollowUpParams {
  leadId: string;
  phone?: string | null;
  intake: QuoteInput;
  language: Language;
}

export function buildFollowUpForLead(params: FollowUpParams): string {
  const { intake, language } = params;
  const status = getIntakeStatus(intake);

  if (status === 'READY_TO_QUOTE') {
    return language === 'es'
      ? `✅ ¡Hola! Somos de Saver Insurance.\n\nTu información está completa. Ya podemos cotizarte.\n\n¿Quieres que te mandemos las cotizaciones ahora?`
      : `✅ Hi! This is Saver Insurance.\n\nYour information is complete. We can quote you now.\n\nWould you like us to send you the quotes?`;
  }

  if (status === 'WAITING_DOCS') {
    return language === 'es'
      ? `👋 ¡Hola! Somos de Saver Insurance.\n\nPara cotizarte, necesitamos que nos mandes una foto de tu póliza actual (página de declaraciones).\n\n📷 Mándala aquí por favor.`
      : `👋 Hi! This is Saver Insurance.\n\nTo get you a quote, we need a photo of your current policy (declarations page).\n\n📷 Please send it here.`;
  }

  const missingRequired = getRequiredMissing(intake);
  const topMissing = missingRequired.slice(0, 3);

  if (topMissing.length === 0) {
    return language === 'es'
      ? `👋 ¡Hola! Somos de Saver Insurance.\n\n¿Cómo podemos ayudarte hoy?`
      : `👋 Hi! This is Saver Insurance.\n\nHow can we help you today?`;
  }

  const missingList = topMissing
    .map((f, i) => `${i + 1}. ${language === 'es' ? f.label_es : f.label_en}`)
    .join('\n');

  const moreCount = missingRequired.length - topMissing.length;
  const moreText = moreCount > 0 
    ? (language === 'es' ? `\n... y ${moreCount} más` : `\n... and ${moreCount} more`)
    : '';

  if (language === 'es') {
    return `👋 ¡Hola! Somos de Saver Insurance.\n\nPara cotizarte, nos falta:\n${missingList}${moreText}\n\n¿Puedes ayudarnos con esto? Responde aquí o manda una foto.`;
  }

  return `👋 Hi! This is Saver Insurance.\n\nTo get you a quote, we need:\n${missingList}${moreText}\n\nCan you help us with this? Reply here or send a photo.`;
}

export function buildQuoteReadyMessage(language: Language): string {
  if (language === 'es') {
    return `🎉 ¡Tenemos tus cotizaciones listas!\n\nTe contactará un agente pronto con las mejores opciones para ti.\n\n¿Tienes alguna pregunta?`;
  }
  return `🎉 Your quotes are ready!\n\nAn agent will contact you soon with the best options for you.\n\nDo you have any questions?`;
}

export function buildReminderMessage(language: Language, daysSinceContact: number): string {
  if (language === 'es') {
    if (daysSinceContact <= 1) {
      return `👋 ¡Hola! Solo quería recordarte que estamos aquí para ayudarte con tu cotización de seguro.\n\n¿Tienes alguna pregunta?`;
    }
    if (daysSinceContact <= 3) {
      return `👋 ¡Hola! No hemos tenido noticias tuyas. ¿Todavía necesitas ayuda con tu seguro de auto?\n\nResponde "Sí" para continuar.`;
    }
    return `👋 ¡Hola! Hace tiempo que no hablamos. Si aún necesitas cotizaciones de seguro, estamos aquí para ayudarte.\n\nResponde cuando quieras continuar.`;
  }

  if (daysSinceContact <= 1) {
    return `👋 Hi! Just a reminder that we're here to help with your insurance quote.\n\nAny questions?`;
  }
  if (daysSinceContact <= 3) {
    return `👋 Hi! We haven't heard from you. Do you still need help with your auto insurance?\n\nReply "Yes" to continue.`;
  }
  return `👋 Hi! It's been a while. If you still need insurance quotes, we're here to help.\n\nReply when you're ready to continue.`;
}

export function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  return cleaned;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const cleanPhone = formattedPhone.replace(/\+/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

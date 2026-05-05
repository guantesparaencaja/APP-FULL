/**
 * emailTemplates.ts — Plantillas HTML de correo para GPTE
 * Diseño: dark boxing theme con acento naranja
 */

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #0f172a;
  color: #e2e8f0;
  margin: 0;
  padding: 0;
`;

const CONTAINER = `
  max-width: 580px;
  margin: 0 auto;
  background-color: #1e293b;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #334155;
`;

const HEADER = `
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  padding: 32px 40px;
  text-align: center;
`;

const BODY = `
  padding: 40px;
`;

const FOOTER = `
  background-color: #0f172a;
  padding: 24px 40px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
`;

const BTN = `
  display: inline-block;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: #ffffff;
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 16px;
  margin-top: 24px;
`;

const DIVIDER = `
  border: none;
  border-top: 1px solid #334155;
  margin: 24px 0;
`;

const INFO_ROW = `
  background: #0f172a;
  border-radius: 8px;
  padding: 16px 20px;
  margin: 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GPTE - Guantes Para Encajar</title>
</head>
<body style="${BASE_STYLE}">
  <div style="padding: 24px 16px; background-color: #0f172a;">
    <div style="${CONTAINER}">
      ${content}
    </div>
    <p style="text-align:center; color:#475569; font-size:12px; margin-top:24px;">
      © 2025 Guantes Para Encajar — Todos los derechos reservados
    </p>
  </div>
</body>
</html>`;
}

// ─── 1. BIENVENIDA ────────────────────────────────────────────────────────────

export function templateWelcome(nombre: string): string {
  return wrap(`
    <div style="${HEADER}">
      <div style="font-size:48px; margin-bottom:12px;">🥊</div>
      <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:800; letter-spacing:-0.5px;">
        ¡Bienvenido al equipo, ${nombre}!
      </h1>
      <p style="margin:8px 0 0; color:#fed7aa; font-size:15px;">
        Guantes Para Encajar — Boxeo & Fitness
      </p>
    </div>
    <div style="${BODY}">
      <h2 style="color:#f97316; margin-top:0; font-size:20px;">
        Tu camino al campeonato comienza hoy 🏆
      </h2>
      <p style="color:#cbd5e1; line-height:1.7; font-size:15px;">
        Hola <strong style="color:#f1f5f9;">${nombre}</strong>, nos alegra mucho tenerte en la familia GPTE.
        Has dado el primer paso para transformar tu cuerpo y mente a través del boxeo.
      </p>
      <hr style="${DIVIDER}">
      <h3 style="color:#e2e8f0; font-size:16px; margin-bottom:16px;">
        ¿Qué puedes hacer ahora?
      </h3>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">📅</span>
        <span style="color:#cbd5e1; font-size:14px;">Reserva tu primera clase desde la app</span>
      </div>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">💪</span>
        <span style="color:#cbd5e1; font-size:14px;">Explora los videos de técnica y vendaje</span>
      </div>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">🎯</span>
        <span style="color:#cbd5e1; font-size:14px;">Completa tu perfil y sube de nivel</span>
      </div>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">🏅</span>
        <span style="color:#cbd5e1; font-size:14px;">Gana XP y desbloquea insignias de combate</span>
      </div>
      <p style="color:#94a3b8; font-size:14px; margin-top:24px; line-height:1.6;">
        <em>"La consistencia hace al campeón. Nos vemos en el ring." 🥊</em>
      </p>
    </div>
    <div style="${FOOTER}">
      Recibiste este correo porque te registraste en GPTE.<br>
      <a href="#" style="color:#f97316; text-decoration:none;">Gestionar preferencias</a>
    </div>
  `);
}

// ─── 2. CONFIRMACIÓN DE RESERVA ───────────────────────────────────────────────

export function templateBookingConfirm(data: {
  nombre: string;
  clase: string;
  fecha: string;
  hora: string;
  tipo?: string;
}): string {
  return wrap(`
    <div style="${HEADER}">
      <div style="font-size:48px; margin-bottom:12px;">📅</div>
      <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:800;">
        ¡Reserva Confirmada!
      </h1>
      <p style="margin:8px 0 0; color:#fed7aa; font-size:14px;">
        Tu lugar está asegurado
      </p>
    </div>
    <div style="${BODY}">
      <p style="color:#cbd5e1; font-size:15px; line-height:1.7;">
        Hola <strong style="color:#f1f5f9;">${data.nombre}</strong>, tu reserva ha sido confirmada. 
        Te esperamos puntual y listo para entrenar. 💪
      </p>
      <hr style="${DIVIDER}">
      <h3 style="color:#f97316; margin-bottom:16px; font-size:16px;">
        Detalles de tu clase
      </h3>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">🥊</span>
        <div>
          <div style="color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Clase</div>
          <div style="color:#f1f5f9; font-weight:600; font-size:15px;">${data.clase}</div>
        </div>
      </div>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">📆</span>
        <div>
          <div style="color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Fecha</div>
          <div style="color:#f1f5f9; font-weight:600; font-size:15px;">${data.fecha}</div>
        </div>
      </div>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">🕐</span>
        <div>
          <div style="color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Hora</div>
          <div style="color:#f1f5f9; font-weight:600; font-size:15px;">${data.hora}</div>
        </div>
      </div>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">🏷️</span>
        <div>
          <div style="color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Tipo</div>
          <div style="color:#f1f5f9; font-weight:600; font-size:15px;">${data.tipo || 'Clase Grupal'}</div>
        </div>
      </div>
      <hr style="${DIVIDER}">
      <div style="background:#1a1a2e; border-left: 3px solid #f97316; padding:16px 20px; border-radius: 0 8px 8px 0;">
        <p style="margin:0; color:#fbbf24; font-size:13px; font-weight:600;">⚠️ Recuerda</p>
        <p style="margin:8px 0 0; color:#94a3b8; font-size:13px; line-height:1.6;">
          Si no puedes asistir, cancela tu reserva con al menos <strong style="color:#f1f5f9;">2 horas de antelación</strong>
          para no perder tu clase del plan.
        </p>
      </div>
    </div>
    <div style="${FOOTER}">
      Guantes Para Encajar — Tu gym de boxeo 🥊
    </div>
  `);
}

// ─── 3. CANCELACIÓN DE CLASE ──────────────────────────────────────────────────

export function templateClassCancel(data: {
  nombre: string;
  clase: string;
  fecha: string;
  hora: string;
  motivo?: string;
}): string {
  return wrap(`
    <div style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 32px 40px; text-align: center;">
      <div style="font-size:48px; margin-bottom:12px;">❌</div>
      <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:800;">
        Clase Cancelada
      </h1>
      <p style="margin:8px 0 0; color:#fca5a5; font-size:14px;">
        Te informamos sobre un cambio en tu horario
      </p>
    </div>
    <div style="${BODY}">
      <p style="color:#cbd5e1; font-size:15px; line-height:1.7;">
        Hola <strong style="color:#f1f5f9;">${data.nombre}</strong>, lamentamos informarte que la siguiente 
        clase ha sido cancelada. Disculpa el inconveniente.
      </p>
      <hr style="${DIVIDER}">
      <h3 style="color:#ef4444; margin-bottom:16px; font-size:16px;">
        Clase cancelada
      </h3>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">🥊</span>
        <div>
          <div style="color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Clase</div>
          <div style="color:#f1f5f9; font-weight:600; font-size:15px;">${data.clase}</div>
        </div>
      </div>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">📆</span>
        <div>
          <div style="color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Fecha</div>
          <div style="color:#f1f5f9; font-weight:600; font-size:15px;">${data.fecha}</div>
        </div>
      </div>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">🕐</span>
        <div>
          <div style="color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Hora</div>
          <div style="color:#f1f5f9; font-weight:600; font-size:15px;">${data.hora}</div>
        </div>
      </div>
      ${data.motivo ? `
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">📝</span>
        <div>
          <div style="color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Motivo</div>
          <div style="color:#f1f5f9; font-weight:600; font-size:15px;">${data.motivo}</div>
        </div>
      </div>
      ` : ''}
      <hr style="${DIVIDER}">
      <p style="color:#94a3b8; font-size:14px; line-height:1.6;">
        Tu cupo en esta clase <strong style="color:#4ade80;">no será descontado</strong> de tu plan. 
        Puedes reservar otra clase disponible en la app. 💪
      </p>
    </div>
    <div style="${FOOTER}">
      Guantes Para Encajar — Tu gym de boxeo 🥊
    </div>
  `);
}

// ─── 4. FELIZ CUMPLEAÑOS ──────────────────────────────────────────────────────

export function templateBirthday(nombre: string): string {
  return wrap(`
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #f97316 100%); padding: 40px 40px; text-align: center;">
      <div style="font-size:60px; margin-bottom:12px;">🎂</div>
      <h1 style="margin:0; color:#ffffff; font-size:30px; font-weight:800; letter-spacing:-0.5px;">
        ¡Feliz Cumpleaños, ${nombre}!
      </h1>
      <p style="margin:12px 0 0; color:#e9d5ff; font-size:16px;">
        El equipo de GPTE te desea lo mejor 🥊
      </p>
    </div>
    <div style="${BODY}; text-align:center;">
      <p style="color:#cbd5e1; font-size:16px; line-height:1.8; margin-top:0;">
        Hoy es tu día especial y queremos celebrarlo contigo. 🎉<br>
        Gracias por ser parte de la familia GPTE y por tu dedicación al boxeo.
      </p>
      <div style="font-size:40px; margin: 24px 0;">🥊 💪 🏆</div>
      <div style="background:#0f172a; border-radius:12px; padding:24px; margin:24px 0;">
        <p style="margin:0; color:#f97316; font-size:18px; font-weight:800;">
          🎁 Regalo de cumpleaños
        </p>
        <p style="margin:12px 0 0; color:#cbd5e1; font-size:15px; line-height:1.6;">
          Hoy tienes <strong style="color:#f1f5f9;">1 clase extra gratuita</strong> como regalo de cumpleaños 
          de parte del equipo. ¡Contáctanos para reclamarla!
        </p>
      </div>
      <hr style="${DIVIDER}">
      <p style="color:#94a3b8; font-size:14px; line-height:1.7; font-style:italic;">
        "Un año más de fuerza, determinación y knockout. <br>
        Sigue siendo campeón dentro y fuera del ring." 🏆
      </p>
      <p style="color:#64748b; font-size:13px; margin-top:8px;">
        — El equipo de Guantes Para Encajar
      </p>
    </div>
    <div style="${FOOTER}">
      Guantes Para Encajar — Tu gym de boxeo 🥊<br>
      ¡Que sea un día increíble! 🎉
    </div>
  `);
}

// ─── 5. CANCELACIÓN TARDÍA ────────────────────────────────────────────────────

export function templateLateCancel(data: {
  nombre: string;
  clase: string;
  fecha: string;
  hora: string;
}): string {
  return wrap(`
    <div style="background: linear-gradient(135deg, #92400e 0%, #b45309 100%); padding: 32px 40px; text-align: center;">
      <div style="font-size:48px; margin-bottom:12px;">⚠️</div>
      <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:800;">
        Cancelación fuera de tiempo
      </h1>
    </div>
    <div style="${BODY}">
      <p style="color:#cbd5e1; font-size:15px; line-height:1.7;">
        Hola <strong style="color:#f1f5f9;">${data.nombre}</strong>, hemos detectado que la siguiente clase 
        no fue cancelada con la antelación requerida.
      </p>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">🥊</span>
        <div>
          <div style="color:#94a3b8; font-size:11px; text-transform:uppercase;">Clase</div>
          <div style="color:#f1f5f9; font-weight:600;">${data.clase}</div>
        </div>
      </div>
      <div style="${INFO_ROW}">
        <span style="font-size:20px;">📆</span>
        <div>
          <div style="color:#94a3b8; font-size:11px; text-transform:uppercase;">Fecha</div>
          <div style="color:#f1f5f9; font-weight:600;">${data.fecha} — ${data.hora}</div>
        </div>
      </div>
      <hr style="${DIVIDER}">
      <div style="background:#1a1a2e; border-left: 3px solid #f59e0b; padding:16px 20px; border-radius: 0 8px 8px 0;">
        <p style="margin:0; color:#fbbf24; font-size:13px; font-weight:600;">Política de cancelación</p>
        <p style="margin:8px 0 0; color:#94a3b8; font-size:13px; line-height:1.6;">
          Las clases deben cancelarse con un mínimo de <strong style="color:#f1f5f9;">2 horas de antelación</strong>. 
          El valor de esta clase será descontado de tu plan vigente.
        </p>
      </div>
    </div>
    <div style="${FOOTER}">
      Guantes Para Encajar — Si tienes dudas, contáctanos 🥊
    </div>
  `);
}

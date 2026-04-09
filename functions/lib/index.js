"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserSecure = exports.updateAdminUserPassword = exports.onBookingDeleted = exports.onBookingUpdated = exports.onBookingCreated = exports.onUserCreated = exports.onVideoDeleted = exports.onVideoCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const googleapis_1 = require("googleapis");
const node_fetch_1 = require("node-fetch");
admin.initializeApp();
const getDriveAuth = () => {
    const privateKey = (process.env.DRIVE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    return new googleapis_1.google.auth.JWT(process.env.DRIVE_EMAIL, undefined, privateKey, ["https://www.googleapis.com/auth/drive"]);
};
exports.onVideoCreated = functions.firestore
    .document("challenges/{challengeId}")
    .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data.url)
        return;
    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!folderId || folderId === "REEMPLAZAR_CON_ID_CARPETA") {
        console.error("DRIVE_FOLDER_ID no está configurado.");
        return;
    }
    try {
        const response = await (0, node_fetch_1.default)(data.url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const auth = getDriveAuth();
        const drive = googleapis_1.google.drive({ version: "v3", auth });
        const res = await drive.files.create({
            requestBody: {
                name: `reto_${context.params.challengeId}.mp4`,
                parents: [folderId],
            },
            media: {
                mimeType: "video/mp4",
                body: require("stream").Readable.from(buffer),
            },
            fields: "id, webViewLink",
        });
        await snap.ref.update({
            driveId: res.data.id,
            driveLink: res.data.webViewLink,
            syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("Sincronizado a Drive: ", res.data.id);
    }
    catch (err) {
        console.error("Error sincronizando video: ", err);
    }
});
exports.onVideoDeleted = functions.firestore
    .document("challenges/{challengeId}")
    .onDelete(async (snap) => {
    const data = snap.data();
    if (!data.driveId)
        return;
    try {
        const auth = getDriveAuth();
        const drive = googleapis_1.google.drive({ version: "v3", auth });
        await drive.files.delete({
            fileId: data.driveId,
        });
        console.log("Eliminado de Drive.", data.driveId);
    }
    catch (err) {
        console.error("Error eliminando de Drive: ", err);
    }
});
// ==========================================
// EMAIL TRIGGERS (Trigger Email Extension)
// ==========================================
function formatDate(dateStr) {
    const parts = (dateStr || "").split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
}
const EMAIL_CONFIG = {
    from: '"GUANTES" <guantesparaencajar@gmail.com>',
    replyTo: 'guantesparaencajar@gmail.com',
};
async function queueMail(to, subject, html) {
    try {
        const professionalHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff; }
                    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #0077ff; }
                    .content { padding: 20px 0; }
                    .footer { text-align: center; font-size: 12px; color: #999; padding-top: 20px; border-top: 1px solid #eeeeee; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #0077ff; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2 style="color: #0077ff; margin: 0;">GUANTES BOXEO</h2>
                    </div>
                    <div class="content">
                        ${html}
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Academia GUANTES d' Encajarte. Todos los derechos reservados.</p>
                        <p>Estás recibiendo este correo porque eres miembro de nuestra academia.</p>
                        <p>Si no deseas recibir más correos, puedes ignorar este mensaje o contactar a soporte.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        await admin.firestore().collection("mail").add({
            to,
            from: EMAIL_CONFIG.from,
            replyTo: EMAIL_CONFIG.replyTo,
            message: {
                subject,
                html: professionalHtml
            },
            headers: {
                "X-Entity-Ref-ID": `${Date.now()}`,
                "List-Unsubscribe": "<mailto:guantesparaencajar@gmail.com?subject=unsubscribe>"
            }
        });
    }
    catch (err) {
        console.error("Error encolando email:", err);
    }
}
exports.onUserCreated = functions.firestore
    .document("users/{userId}")
    .onCreate(async (snap) => {
    const d = snap.data();
    if (!d.email)
        return;
    const html = "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f1f5f9; border-radius: 10px;\">"
        + "<h1 style=\"color: #0077ff; text-align: center;\">Bienvenido a GUANTES, " + (d.name || "Boxeador") + "!</h1>"
        + "<p style=\"font-size: 16px;\">Estamos muy emocionados de tenerte en nuestra comunidad de entrenamiento.</p>"
        + "<p style=\"font-size: 16px;\">Tu objetivo: <strong>" + (d.boxing_goal || "Aprender boxeo") + "</strong> - <strong>" + (d.fitness_goal || "Mejorar tu fisico") + "</strong>. Preparate para sudar y alcanzar tus metas.</p>"
        + "<div style=\"text-align: center; margin-top: 30px;\"><a href=\"https://gpte007.web.app\" style=\"background-color: #0077ff; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;\">Comenzar a Entrenar</a></div>"
        + "</div>";
    await queueMail(d.email, "Bienvenido a GUANTES!", html);
    console.log("Email de bienvenida encolado para: " + d.email);
    // Mensaje de bienvenida in-app
    await admin.firestore().collection("notifications").add({
        user_id: snap.id,
        title: "¡Bienvenido a GUANTES!",
        message: "Estamos muy emocionados de tenerte en nuestra comunidad de entrenamiento. ¡Prepárate para sudar!",
        type: "success",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
});
exports.onBookingCreated = functions.firestore
    .document("bookings/{bookingId}")
    .onCreate(async (snap) => {
    const d = snap.data();
    if (!d.user_email)
        return;
    const fd = formatDate(d.date);
    let subject = "";
    let html = "";
    if (d.status === "active") {
        subject = "Reserva de Clase Confirmada - GUANTES";
        html = "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f1f5f9; border-radius: 10px;\">"
            + "<h1 style=\"color: #10b981; text-align: center;\">Clase Reservada!</h1>"
            + "<p>Hola <strong>" + (d.user_name || "Boxeador") + "</strong>, has reservado exitosamente una clase.</p>"
            + "<div style=\"background-color: #1e293b; padding: 15px; border-radius: 8px; margin: 20px 0;\">"
            + "<p><strong>Fecha:</strong> " + fd + "</p><p><strong>Hora:</strong> " + d.time + "</p>"
            + "</div>"
            + "<p style=\"color: #94a3b8;\">Recuerda llegar 10 minutos antes. Cancela con al menos 2 horas de anticipacion.</p>"
            + "</div>";
    }
    else if (d.status === "waitlist") {
        subject = "Lista de Espera - GUANTES";
        html = "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f1f5f9; border-radius: 10px;\">"
            + "<h1 style=\"color: #3b82f6; text-align: center;\">En Lista de Espera</h1>"
            + "<p>Hola <strong>" + (d.user_name || "Boxeador") + "</strong>, te uniste a la lista de espera para el " + fd + " a las " + d.time + ".</p>"
            + "<p style=\"color: #94a3b8;\">Te notificaremos si se libera un cupo.</p>"
            + "</div>";
    }
    if (subject && html)
        await queueMail(d.user_email, subject, html);
});
exports.onBookingUpdated = functions.firestore
    .document("bookings/{bookingId}")
    .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === after.status)
        return;
    if (!after.user_email)
        return;
    const fd = formatDate(after.date);
    let subject = "";
    let html = "";
    if (after.status === "cancelled") {
        subject = "Reserva Cancelada - GUANTES";
        const devolucion = before.status === "active"
            ? "<p style=\"color: #10b981;\">Se ha devuelto 1 clase a tu plan.</p>"
            : "";
        html = "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f1f5f9; border-radius: 10px;\">"
            + "<h1 style=\"color: #ef4444; text-align: center;\">Clase Cancelada</h1>"
            + "<p>Hola <strong>" + (after.user_name || "Boxeador") + "</strong>, tu reserva del " + fd + " a las " + after.time + " fue cancelada.</p>"
            + devolucion
            + "<div style=\"text-align: center; margin-top: 20px;\"><a href=\"https://gpte007.web.app\" style=\"background-color: #0077ff; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;\">Reagendar</a></div>"
            + "</div>";
    }
    else if (before.status === "pending_payment" && after.status === "active") {
        subject = "Pago Confirmado - GUANTES";
        html = "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f1f5f9; border-radius: 10px;\">"
            + "<h1 style=\"color: #10b981; text-align: center;\">Clase Confirmada!</h1>"
            + "<p>Hola <strong>" + (after.user_name || "Boxeador") + "</strong>, tu pago fue verificado.</p>"
            + "<div style=\"background-color: #1e293b; padding: 15px; border-radius: 8px; margin: 20px 0;\">"
            + "<p><strong>Fecha:</strong> " + fd + "</p><p><strong>Hora:</strong> " + after.time + "</p>"
            + "</div></div>";
    }
    if (subject && html)
        await queueMail(after.user_email, subject, html);
});
exports.onBookingDeleted = functions.firestore
    .document("bookings/{bookingId}")
    .onDelete(async (snap) => {
    const d = snap.data();
    if (!d.user_email)
        return;
    if (d.status !== "active" && d.status !== "waitlist")
        return;
    const fd = formatDate(d.date);
    const subject = "Reserva Eliminada - GUANTES";
    const html = "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f1f5f9; border-radius: 10px;\">"
        + "<h1 style=\"color: #f59e0b; text-align: center;\">Reserva Eliminada</h1>"
        + "<p>Hola <strong>" + (d.user_name || "Boxeador") + "</strong>, tu reserva del " + fd + " a las " + d.time + " fue eliminada por administracion. Si fue un error, contactanos.</p>"
        + "</div>";
    if (subject && html)
        await queueMail(d.user_email, subject, html);
});
exports.updateAdminUserPassword = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión");
    }
    const callerUid = context.auth.uid;
    const callerSnap = await admin.firestore().collection("users").doc(callerUid).get();
    const callerData = callerSnap.data();
    if ((callerData === null || callerData === void 0 ? void 0 : callerData.role) !== "admin" && (callerData === null || callerData === void 0 ? void 0 : callerData.email) !== "guantesparaencajar@gmail.com") {
        throw new functions.https.HttpsError("permission-denied", "Solo administradores pueden realizar esta acción");
    }
    const { uid, newPassword } = data;
    if (!uid || typeof newPassword !== "string" || newPassword.length < 6) {
        throw new functions.https.HttpsError("invalid-argument", "Datos inválidos o la contraseña es muy corta (mínimo 6 caracteres).");
    }
    try {
        await admin.auth().updateUser(uid, { password: newPassword });
        return { success: true, message: "Contraseña actualizada exitosamente" };
    }
    catch (error) {
        console.error("Error actualizando contraseña:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error al actualizar la contraseña");
    }
});
exports.deleteUserSecure = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión");
    }
    const callerUid = context.auth.uid;
    const callerSnap = await admin.firestore().collection("users").doc(callerUid).get();
    const callerData = callerSnap.data();
    if ((callerData === null || callerData === void 0 ? void 0 : callerData.role) !== "admin" && (callerData === null || callerData === void 0 ? void 0 : callerData.email) !== "hernandezkevin001998@gmail.com") {
        throw new functions.https.HttpsError("permission-denied", "Solo administradores pueden realizar esta acción");
    }
    const { uid } = data;
    if (!uid || typeof uid !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "ID de usuario inválido.");
    }
    try {
        // Borrar el registro de Auth
        await admin.auth().deleteUser(uid);
        // Borrar el documento base en Firestore (las subcolecciones se conservan por diseño)
        await admin.firestore().collection("users").doc(uid).delete();
        return { success: true, message: "Usuario eliminado correctamente" };
    }
    catch (error) {
        console.error("Error eliminando usuario de forma segura:", error);
        throw new functions.https.HttpsError("internal", error.message || "Error al eliminar el usuario");
    }
});
//# sourceMappingURL=index.js.map
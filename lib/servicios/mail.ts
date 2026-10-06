/**
 * Unico modulo que le habla a Resend. Las cuatro reglas de la clase 7:
 *
 *   1. Timeout siempre, sin excepciones.
 *   2. Devuelve, no lanza: que el correo falle es un caso previsto.
 *   3. La credencial vive aca y solo aca (se lee de env, nunca por parametro).
 *   4. Loguea la falla.
 *
 * Ver docs/spec.md seccion 8: que operacion usa cada correo, y por que las
 * tres son accesorias (la operacion que las dispara ya se completo cuando
 * el correo se intenta enviar).
 */
import { Resend } from "resend";
import type { RolColaborador } from "@/lib/schemas/miembro";

const TIMEOUT_MS = 5_000;
const INTENTOS = 3; // el intento original + 2 reintentos
const ESPERA_ENTRE_INTENTOS_MS = 500;

// Remitente de prueba de Resend: funciona sin verificar un dominio propio,
// pero en ese modo Resend solo entrega a la casilla de la cuenta (ver
// docs/spec.md seccion 8, "Limitacion conocida del entorno de pruebas").
const REMITENTE = "Documentacion Versionada <onboarding@resend.dev>";

function obtenerCliente() {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) return null; // sin credencial = no disponible, igual que cualquier otra falla
  return new Resend(clave);
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// El SDK de Resend no expone un hook de timeout (no acepta un fetch propio
// como el cliente de Supabase de la clase pasada), asi que se envuelve la
// llamada en una carrera contra un limite de tiempo propio.
function conTimeout<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`Se agoto el tiempo de espera (${ms}ms)`)), ms);
    promesa.then(
      (valor) => {
        clearTimeout(id);
        resolve(valor);
      },
      (error: unknown) => {
        clearTimeout(id);
        reject(error);
      },
    );
  });
}

// Envia un correo con timeout y hasta 3 intentos. Nunca lanza: devuelve
// true si se entrego, false si fallaron todos los intentos (o falta la
// credencial). Quien llama decide que hacer con ese false (ver seccion 8).
export async function enviarCorreo(destinatario: string, asunto: string, html: string): Promise<boolean> {
  const cliente = obtenerCliente();
  if (!cliente) {
    console.error("mail: RESEND_API_KEY no configurada, no se envia el correo");
    return false;
  }

  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      const { error } = await conTimeout(
        cliente.emails.send({ from: REMITENTE, to: destinatario, subject: asunto, html }),
        TIMEOUT_MS,
      );
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`mail: intento ${intento}/${INTENTOS} fallo al enviar a ${destinatario}`, error);
      if (intento < INTENTOS) await esperar(ESPERA_ENTRE_INTENTOS_MS);
    }
  }

  return false;
}

const NOMBRE_ROL: Record<RolColaborador, string> = { EDITOR: "Editor", READER: "Lector" };

function urlBase() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

// H2: invitacion con el rol ofrecido y un link para aceptar o rechazar.
export function enviarInvitacion(datos: {
  destinatario: string;
  nombreProyecto: string;
  rol: RolColaborador;
  proyectoId: string;
  usuarioId: string;
}): Promise<boolean> {
  const base = `${urlBase()}/api/proyectos/${datos.proyectoId}/miembros/${datos.usuarioId}`;
  const html = `
    <p>Te invitaron a colaborar en <strong>${datos.nombreProyecto}</strong> con el rol
    <strong>${NOMBRE_ROL[datos.rol]}</strong>.</p>
    <p>
      <a href="${base}/aceptar">Aceptar invitación</a>
      &nbsp;|&nbsp;
      <a href="${base}/rechazar">Rechazar invitación</a>
    </p>
    <p>Tenés que estar logueado con esta cuenta para que el link funcione.</p>
  `;
  return enviarCorreo(datos.destinatario, `Invitación a colaborar en ${datos.nombreProyecto}`, html);
}

// H2: correo de despedida cuando el dueño quita a un colaborador (o el
// colaborador usa "No colaborar").
export function enviarDespedida(datos: {
  destinatario: string;
  nombreProyecto: string;
}): Promise<boolean> {
  const html = `<p>Ya no formás parte del equipo de colaboradores de <strong>${datos.nombreProyecto}</strong>.</p>`;
  return enviarCorreo(datos.destinatario, `Dejaste de colaborar en ${datos.nombreProyecto}`, html);
}

// H1: aviso a los colaboradores cuando el dueño elimina el proyecto.
export function enviarAvisoEliminacion(datos: {
  destinatario: string;
  nombreProyecto: string;
}): Promise<boolean> {
  const html = `<p>El dueño eliminó el proyecto <strong>${datos.nombreProyecto}</strong> y toda su documentación.</p>`;
  return enviarCorreo(datos.destinatario, `Se eliminó el proyecto ${datos.nombreProyecto}`, html);
}

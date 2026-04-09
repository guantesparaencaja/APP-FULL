# Guía para Evitar el SPAM en los Correos

He actualizado el código para incluir encabezados profesionales y una identidad de remitente clara. Sin embargo, para que los correos lleguen a la **Bandeja de Entrada** y no a SPAM, debes realizar estas configuraciones en tu panel de control de Firebase y en tu proveedor de dominio.

## 1. Configuración en el Panel de Firebase (SMTP de Gmail)

Usa estos datos exactos en la pantalla de **"Configuración del SMTP"** que me mostraste:

- **Dirección de correo del remitente**: `guantesparaencajar@gmail.com`
- **Host del servidor SMTP**: `smtp.gmail.com`
- **Puerto del servidor SMTP**: `587`
- **Nombre de usuario**: `guantesparaencajar@gmail.com`
- **Contraseña para la cuenta de SMTP**: `srvo wxmz dnzp maoq`
- **Modo de seguridad SMTP**: Selecciona `TLS`

### IMPORTANTE: Repite esto en la Extensión "Trigger Email"
Para que los correos de **Bienvenida** y **Reservas** también funcionen:
1. Ve a **Extensions** > **Trigger Email** > **Manage** > **Configure**.
2. Busca los campos de SMTP y pega exactamente la misma información que arriba.

## 2. Configuración de DNS (PASO A PASO DETALLADO)

Este es el paso que le dice a Gmail: *"Mi dominio `guantesparaencajar.com` autoriza a que salgan correos de mi parte"*.

### ¿Dónde se hace esto?
Debes entrar a la página donde compraste tu dominio (ejemplo: **GoDaddy**, **Hostinger**, **Namecheap**, **Google Domains**).

### Instrucciones Generales:
1.  Inicia sesión en tu proveedor de dominio.
2.  Busca la sección que diga **"DNS"**, **"Mis Dominios"**, **"Gestionar DNS"** o **"Editor de zonas"**.
3.  Verás una tabla con muchos registros (A, CNAME, TXT, MX). Vamos a añadir **3 nuevos registros del tipo "TXT"**.

---

### Registro 1: SPF (El permiso de envío)
*   **Tipo**: `TXT`
*   **Nombre/Host**: `@` (o déjalo en blanco si ya sale tu dominio completo)
*   **Valor**: `v=spf1 include:_spf.google.com ~all`
*   *Nota: Si ya tienes uno que empieza con "v=spf1", no crees uno nuevo; simplemente edita el actual y añade `include:_spf.google.com` antes del `~all`.*

### Registro 2: DKIM (La firma digital)
*   **Tipo**: `TXT`
*   **Nombre/Host**: `google._domainkey`
*   **Valor**: (Este código largo te lo da Google Workspace o tu proveedor SMTP. Si usas Gmail normal, a veces no es necesario, pero si usas el SMTP de la imagen, ya vas por buen camino).

### Registro 3: DMARC (La política de seguridad)
*   **Tipo**: `TXT`
*   **Nombre/Host**: `_dmarc`
*   **Valor**: `v=DMARC1; p=none; sp=none;`

---

> [!TIP]
> **El truco final**: Si esto te parece muy difícil, puedes copiar estos 3 recuadros y **enviárselos por chat al soporte técnico de tu proveedor de dominio** (ej: GoDaddy). Diles: *"Hola, deseo añadir estos 3 registros TXT a mi configuración DNS para que mis correos no lleguen a spam"*. Ellos lo harán por ti en unos segundos.

## 3. Consejos de Contenido
- Evita usar palabras como "GRATIS", "HAZ CLIC AQUÍ", o demasiados signos de exclamación en el **Asunto**.
- He mejorado las plantillas HTML en el código para que incluyan un pie de página con información legal y un link de desuscripción, lo cual mejora la reputación del remitente ante Gmail y Outlook.

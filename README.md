# NotarIA 🛡️🩺
> Notarización criptográfica e inmutable de consultas médicas asistidas por Inteligencia Artificial sobre **Arkiv Network**.

---

## 👥 Equipo y Proyecto
* **Nombre del Proyecto:** NotarIA
* **Integrantes del Equipo:**
  * **Ignacio Wuilloud** - [@ignaciowuilloud](https://github.com/ignaciowuilloud) (GitHub)

---

## 🎯 Track, Problema y Solución
* **Track Elegido:** Integración e Innovación con Arkiv Network (Notarización y Auditoría Descentralizada).

### 🔍 Descripción del Problema
En el sector salud, la alteración no autorizada de historiales clínicos y minutas de consulta representa un riesgo crítico de fraude, ocultamiento de mala praxis o manipulación de diagnósticos. Las bases de datos tradicionales de los sistemas de historias clínicas electrónicas (EHR) son centralizadas. Si un administrador con acceso root, un atacante o el propio prestador decide alterar un registro histórico, no hay un mecanismo inmutable e independiente que demuestre que el registro original fue modificado de forma retroactiva.

### 💡 Nuestra Solución
**NotarIA** resuelve esto combinando IA médica generativa con notarización inmutable en blockchain:
1. **Asistente Clínico Inteligente:** El médico interactúa con un asistente IA (Gemini) durante la consulta para estructurar información en bullets, alternativas y resúmenes automáticos basados exclusivamente en el historial médico del paciente.
2. **Sellado Criptográfico Inmutable:** Al finalizar la consulta, el médico realiza un "Sellado". Esto calcula el hash SHA-256 encadenado de la conversación completa y lo registra en **Arkiv Network** (testnet Braga) firmándolo digitalmente.
3. **Auditoría Descentralizada de Integridad:** Un motor de auditoría permite verificar en caliente si la base de datos actual coincide con el bloque registrado. Cualquier alteración de un solo caracter en los mensajes guardados en Supabase o en las firmas locales romperá la concordancia de hash y el sistema alertará inmediatamente la manipulación del historial clínico.

---

## 🛠️ Stack Técnico
* **Framework Frontend:** Next.js 15 (App Router, Server Actions) + React 19 + TypeScript
* **Base de Datos y Autenticación:** Supabase (PostgreSQL + RLS)
* **Estilos y UX:** Tailwind CSS + Shadcn UI + Lucide Icons
* **Inteligencia Artificial:** Google Gemini API (para generación interactiva de minutas estructuradas y resúmenes de una oración/5 palabras para el listado)
* **Web3 / Blockchain SDK:** `@arkiv-network/sdk` con la red Braga Testnet.

---

## ⚡ Instrucciones para Correr Localmente

### 1. Clonar el repositorio
```bash
git clone https://github.com/ignaciowuilloud/notaria-arkiv.git
cd notaria-arkiv
```

### 2. Instalar dependencias
```bash
npm install
# o con pnpm
pnpm install
```

### 3. Configurar variables de entorno (`.env`)
Creá un archivo `.env` en la raíz del proyecto con las siguientes variables:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role

# Google Gemini API Key
GEMINI_API_KEY=tu_gemini_api_key

# Arkiv Network Configuration (Braga Testnet)
# Clave privada de la wallet para firmar transacciones de creación de entidades
ARKIV_PRIVATE_KEY=tu_private_key_para_braga_testnet
```

### 4. Ejecutar el servidor de desarrollo
```bash
npm run dev
# o con pnpm
pnpm dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🎥 Videos (Pitch & Demo)
* 📺 **Video Combinado (Pitch + Demo):** `[Insertar Link del Video Aquí]`

---

## 🤖 Declaración de Herramientas de IA Usadas
Para el diseño y desarrollo de este proyecto se utilizaron las siguientes herramientas:
* **antigravity:** Agente autónomo de programación de Google DeepMind para la implementación del código typescript, integraciones con el SDK de Arkiv, refactorización y resolución de lints y tipos.
* **figma make:** Utilizado para idear el flujo visual, paleta de colores y la distribución del diseño de las tarjetas y el chat.
* **v0:** Para la maquetación inicial y la estructura de componentes web responsivos.
* **gemini:** Como motor de IA clínica embebido en la aplicación y para estructurar los prompts de respuesta médica.

---

## 📊 Declaración de Datasets
* **Datos Utilizados:** No se utilizaron datasets reales ni datos personales de terceros. Toda la información de pacientes, identificaciones (DNI), diagnósticos e historiales médicos mostrados en las capturas y la demostración son **100% ficticios y mockeados** con fines de validación técnica.

---

## 🔐 ¿Qué datos se almacenan o verifican en Arkiv y por qué?

Para cumplir con las regulaciones de privacidad médica (como **HIPAA** y **GDPR**), el sistema sigue un principio estricto de **cero almacenamiento de información de salud protegida (PII/PHI) en la blockchain**:

### 1. ¿Qué datos se almacenan en Arkiv?
Al sellar una consulta, se registra una entidad en Braga Testnet con los siguientes datos:
* **Firma Criptográfica (Hash SHA-256):** Un hash de un solo sentido generado a partir de la concatenación ordenada de la conversación (`"role: mensaje | role: mensaje"`).
* **Atributos de Indexación (Metadatos):**
  * `app = "notaria"`
  * `type = "clinical_session"`
  * `sessionId`: El ID único del registro local.
  * `sealedAt`: Timestamp del sellado.

### 2. ¿Qué datos NO se almacenan?
* **Ningún dato clínico en texto plano:** No se suben diagnósticos, síntomas, recetas ni el contenido de las conversaciones.
* **Ningún dato de identificación personal:** No se suben nombres de pacientes, documentos (DNI), direcciones, ni datos de los profesionales de salud.

### 3. ¿Por qué se hace de esta manera?
* **Privacidad por Diseño (Compliance):** Almacenar información de salud protegida en un registro descentralizado público es ilegal e inviable. El uso de hashes asegura confidencialidad matemática absoluta.
* **Inmutabilidad y Detección de Fraude:** El hash actúa como una huella digital única. Si un atacante o base de datos centralizada altera retrospectivamente un solo caracter de la conversación, el hash reconstruido localmente diferirá del hash inmutable de Arkiv, alertando al instante que la consulta fue manipulada.
* **Auditoría Independiente:** Los metadatos de indexación permiten a un auditor consultar en Arkiv (`arkiv_query`) si una sesión existe y cuál es su firma, pudiendo verificar la validez de los datos de manera externa y autónoma.

---

## 🔗 Integración Detallada con Arkiv Network
NotarIA utiliza tres capacidades del SDK de Arkiv para descentralizar la confianza médica:

### 1. Registro de Entidades (`createEntity`)
Cuando la consulta finaliza, el médico presiona **Sellar**. El backend de la app compila el texto completo de la conversación en un formato canónico (`"user: mensaje | assistant: mensaje"`), calcula su hash criptográfico SHA-256 y utiliza `walletClient.createEntity` para registrarlo.
* **Ubicación en el código:** [registerSessionOnArkiv en lib/arkiv.ts](file:///Users/ignaciowuilloud/Documents/notarIA-arkiv/notaria-arkiv/lib/arkiv.ts#L56-L93)
* **Funcionamiento:** Se crea un payload inmutable que asocia el hash de la sesión con atributos indexables como el `sessionId` del paciente, el `doctorId`, y la marca de tiempo del sellado. Esta operación es firmada por la wallet del médico utilizando la `ARKIV_PRIVATE_KEY` en la testnet Braga.

### 2. Consulta por Atributos (`arkiv_query`)
Durante el proceso de auditoría y verificación en caliente, la aplicación no confía únicamente en el ID de entidad almacenado en su base de datos Supabase (el cual también podría haber sido alterado). En su lugar, realiza una consulta descentralizada directamente al nodo RPC de Arkiv.
* **Ubicación en el código:** [findArkivEntityKeyBySessionId en lib/arkiv.ts](file:///Users/ignaciowuilloud/Documents/notarIA-arkiv/notaria-arkiv/lib/arkiv.ts#L193-L224) y [GET en app/api/session/[id]/audit/route.ts](file:///Users/ignaciowuilloud/Documents/notarIA-arkiv/notaria-arkiv/app/api/session/%5Bid%5D/audit/route.ts#L88-L105)
* **Funcionamiento:** Envía una solicitud JSON-RPC `arkiv_query` con los filtros `app = "notaria" && type = "clinical_session" && sessionId = "${sessionId}"`. De esta forma, el sistema recupera la `entityKey` correcta directamente de la red Braga de forma autónoma.

### 3. Recuperación de Entidades (`getEntity`)
Una vez obtenida la clave de la entidad inmutable (ya sea por query en caliente o fallback de la base de datos), el sistema descarga el payload inmutable desde Arkiv Network para comprobar su validez.
* **Ubicación en el código:** [verifySessionOnArkiv en lib/arkiv.ts](file:///Users/ignaciowuilloud/Documents/notarIA-arkiv/notaria-arkiv/lib/arkiv.ts#L99-L138)
* **Funcionamiento:** Llama a `arkivPublicClient.getEntity(entityKey)` para obtener el payload almacenado de forma inmutable en la red. Compara el campo `hash` de los datos de la red con el hash obtenido al reconstruir localmente la conversación con los mensajes actuales de Supabase. Si coinciden, la auditoría muestra un estado verde de **Conversación Íntegra**; si difieren, arroja un estado rojo de **Datos Manipulados**.

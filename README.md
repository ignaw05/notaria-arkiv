# NotarIA 🛡️🩺
> Notarización criptográfica e inmutable de consultas médicas asistidas por Inteligencia Artificial sobre **Arkiv Network**.

---

## 👥 Equipo y Proyecto
* **Nombre del Proyecto:** NotarIA
* **Demo:** [notaria-arkiv.vercel.app](https://notaria-arkiv.vercel.app)
* **Pitch + Video Demos:** [link video](https://youtu.be/fHvbg9qbpq8?si=mK5hHQETcYhjD8d9)
* **Integrantes del Equipo:**
  * **Ignacio Wuilloud** - [@ignaw05](https://github.com/ignaw05) (GitHub)

---

## 🎯 Track, Problema y Solución
* **Track Elegido:** Arkiv Network

### 🔍 Descripción del Problema
La Inteligencia Artificial ya no es una promesa a futuro; es la infraestructura de hoy. Cada día, más industrias delegan tareas a la IA, desde la atención al cliente hasta decisiones que antes parecían exclusivas del juicio humano. En el sector salud, la adopción es masiva: cada vez más consultorios médicos y clínicas implementan software con IA para agilizar diagnósticos, analizar síntomas complejos y revisar interacciones medicamentosas.

Pero hay un elefante en la sala: **la caja negra tecnológica**.

Pensemos en un caso concreto:
> Un médico atiende a un paciente de 67 años, hipertenso, con medicación preexistente. Está apurado. En lugar de redactar un prompt detallado con los antecedentes, la medicación actual y las contraindicaciones posibles, le pregunta a la IA de su clínica algo así como: *¿Puedo combinar este medicamento con ibuprofeno?* Sin contexto. Sin historial. Sin los datos que el sistema necesitaba para dar una respuesta precisa.
> 
> La IA responde. El médico, confiando en esa respuesta, emite la receta.
> 
> Dos semanas después, el paciente sufre una reacción adversa grave y denuncia al médico por mala praxis.
> 
> El médico sabe lo que hizo. Sabe que la consulta fue descuidada. Y sabe que si ese prompt aparece en el juicio, no tiene defensa. Entonces hace lo que cualquier persona con acceso a la base de datos de su clínica puede hacer: entra, modifica el prompt original, y escribe uno nuevo. Uno prolijo. Con antecedentes, con medicación preexistente y con todas las contraindicaciones bien detalladas. Un prompt que demuestra diligencia. Un prompt que nunca existió.
> 
> Y listo. La historia cambió. El médico negligente ahora parece un profesional impecable. El paciente pierde el juicio. Y nadie puede probar nada, porque el archivo dice exactamente lo que el médico quiso que dijera.

**La confianza en la tecnología médica solo es posible cuando cada decisión asistida por IA queda grabada de forma irrefutable.**

### 💡 Nuestra Solución (Flujo de la Aplicación)
Es por eso que creamos **NotarIA**, el escribano digital para decisiones médicas asistidas por IA. El flujo de funcionamiento de la aplicación está integrado directamente en nuestro código y base de datos:

1. **Identidad Web3 e Integración de Billetera:** El profesional médico conecta su wallet descentralizada (MetaMask u otras) directamente en la barra lateral de la app. El sistema detecta y asiste en el cambio automático a **Braga Testnet** (Chain ID `60138453102` / hex `0xe0087f86e` y token `GLM`). La dirección vinculada se sincroniza con su perfil seguro de Supabase.
2. **Contextualización Médica (Inicio de Consulta):** El médico inicia una *Nueva Consulta* para un paciente. El sistema extrae su historial médico (diagnósticos, cirugías, tratamientos) y lo utiliza para alimentar el contexto del chat clínico. Al crear un nuevo paciente, se registra de forma independiente en Arkiv Network como una entidad de tipo `patient` con una expiración inmutable de 10 años (`expiresIn: 315360000` segundos) para historiales clínicos a largo plazo.
3. **Encadenamiento de Mensajes Local:** Durante la consulta, el médico interactúa con la IA (alimentada por Gemini API con prompts estructurados). Cada mensaje del médico y respuesta del asistente se guarda en la base de datos local y se encadena criptográficamente registrando el `hash` y el `previous_hash` del mensaje anterior, formando una cadena local inmutable de mensajes.
4. **Resumen Inteligente:** Al sellar la sesión o al salir de la pantalla de consulta, se ejecuta un endpoint en segundo plano (`/api/session/[id]/summary`) que genera un resumen objetivo en una sola oración generado por Gemini, optimizando el panel del historial del paciente.
5. **Notarización Descentralizada y Modelo de Propiedad ($owner y $creator):** Al sellar la consulta, el sistema genera el hash SHA-256 definitivo del texto canónico. El backend de la app registra la entidad `clinical_session` en Braga Testnet firmando con la clave del servidor para proveer **atribución a prueba de manipulaciones** (`$creator` es el servidor de NotarIA). Inmediatamente después, el servidor ejecuta la transferencia de propiedad (`changeOwnership`) on-chain hacia la wallet conectada del médico (`$owner` es la wallet del médico), configurando una expiración diferenciada de 5 años (`expiresIn: 157680000` segundos).
6. **Auditoría e Integridad Blockchain:**
   * Cuando un auditor externo busca verificar la consulta, el sistema realiza primero una búsqueda descentralizada en el nodo RPC de Arkiv (`arkiv_query`) buscando la entidad por su `sessionId`.
   * Con la clave resuelta, ejecuta `getEntity` para obtener la firma inmutable de la blockchain y lee al propietario actual (`owner`) de la entidad en Braga Testnet.
   * Reconstruye el hash de la conversación usando los mensajes locales. Si difieren del hash inmutable de la blockchain, la app alerta visualmente **"Datos Manipulados"** y advierte al auditor. Si coinciden, valida la **"Conversación Íntegra"** y muestra la wallet del médico como propietario soberano del registro en la testnet Braga.

**No auditamos a la IA. Auditamos la verdad —y la verdad no debería depender de quién tiene acceso a la base de datos.**

---

## ⚖️ Marco Legal y Regulatorio
NotarIA fue desarrollado respetando la normativa legal en cada una de sus capas de diseño:
* **Ley 25.326 de Protección de Datos Personales (Argentina):** El texto completo de la consulta médica y la identidad real de los pacientes se almacenan localmente bajo medidas de seguridad y cifrado. A la red descentralizada pública de Arkiv **solo viaja el hash criptográfico de un solo sentido** y IDs relacionales anónimos, imposibilitando la ingeniería inversa de los datos médicos.
* **Ley 26.529 (Derechos del Paciente y de la Historia Clínica):** Establece que los registros de salud deben ser íntegros e inalterables. NotarIA implementa esta inalterabilidad de manera técnica y matemática externa a la base de datos tradicional.
* **Ley 17.132 (Ejercicio de la Medicina):** Declara al médico como el responsable final de cada prescripción o decisión clínica. NotarIA protege al médico responsable (demostrando inmutablemente la diligencia de su consulta) y al paciente (evitando que se reescriba el historial clínico para tapar un error médico).

---

## 🛠️ Stack Técnico
* **Framework Frontend:** Next.js 15 (App Router, Server Actions) + React 19 + TypeScript
* **Base de Datos y Autenticación:** Supabase (PostgreSQL + RLS)
* **Estilos y UX:** Tailwind CSS + Shadcn UI + Lucide Icons
* **Inteligencia Artificial:** Google Gemini API (para generación interactiva de minutas estructuradas y resúmenes de una oración para el listado)
* **Web3 / Blockchain SDK:** `@arkiv-network/sdk` con la red Braga Testnet y MetaMask RPC API.

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
Al sellar una consulta, se registra una entidad de tipo `clinical_session` y otra de tipo `patient` en Braga Testnet con los siguientes datos:
* **Firma Criptográfica (Hash SHA-256):** Un hash de un solo sentido generado a partir de la concatenación ordenada de la conversación (`"role: mensaje | role: mensaje"`).
* **Atributos de Indexación (Metadatos):**
  * `app = "notaria"`
  * `type = "clinical_session"` o `type = "patient"`
  * `sessionId` o `patientId`: IDs únicos de los registros locales correspondientes.
  * Relación `patientEntityKey`: La referencia on-chain al paciente padre.
  * `doctorId` y `patientId`: Atributos adicionales para consultas indexadas directas.

* **Ejemplo de Payload de una entidad `clinical_session` registrada on-chain:**
  ```json
  {
    "type": "clinical_session",
    "sessionId": "4f0e8e77-8f31-4bf2-b9a1-91544deb63d0",
    "hash": "93b76e50eab17b6e9de7ba04fd0355733bb25bb0e23103697a271085fa864007",
    "doctorId": "057322c9-72b8-434b-86fc-d9508b94af82",
    "patientId": "245cf965-60cc-420b-bf1e-854cc02ba60e",
    "patientEntityKey": "0xf12f0b028a3fccf22d28e9dfb6adf0c5b9df4b6bad259d4cba1c6f5e7165ff8a",
    "messageCount": 8,
    "sealedAt": "2026-05-29T13:17:28.816Z"
  }
  ```

### 2. ¿Qué datos NO se almacenan?
* **Ningún dato clínico en texto plano:** No se suben diagnósticos, síntomas, recetas ni el contenido de las conversaciones.
* **Ningún dato de identificación personal:** No se suben nombres de pacientes, documentos (DNI), direcciones, ni datos sensibles de los profesionales de salud.

### 3. ¿Por qué se hace de esta manera?
* **Privacidad por Diseño (Compliance):** Almacenar información de salud protegida en un registro descentralizado público es ilegal e inviable. El uso de hashes asegura confidencialidad matemática absoluta.
* **Inmutabilidad y Detección de Fraude:** El hash actúa como una huella digital única. Si un atacante o base de datos centralizada altera retrospectivamente un solo caracter de la conversación, el hash reconstruido localmente diferirá del hash inmutable de Arkiv, alertando al instante que la consulta fue manipulada.
* **Soberanía y Modelo de Propiedad ($owner):** Al transferir la propiedad al médico, este se convierte en el único soberano autorizado a interactuar con su registro en el futuro, mientras NotarIA garantiza la autenticidad origen (`$creator`).

---

## 🔗 Integración Detallada con Arkiv Network
NotarIA utiliza cuatro capacidades del SDK de Arkiv para descentralizar la confianza médica:

### 1. Registro de Entidades Relacionadas (`createEntity`)
* **Pacientes (`patient`):** Se registran de forma inmutable con una expiración de 10 años (`expiresIn: 315360000`). La propiedad de esta entidad se transfiere al médico si tiene su wallet Web3 conectada.
* **Sesiones (`clinical_session`):** Se registran inmutablemente con una expiración de 5 años (`expiresIn: 157680000`). Incluyen en sus atributos la clave de entidad blockchain del paciente (`patientEntityKey`), estableciendo un vínculo relacional padre-hijo directamente en el grafo de Arkiv Network.

### 2. Transferencia de Propiedad On-Chain (`changeOwnership`)
* **Abstracción Blockchain:** Para que el médico sea dueño soberano del registro sin tener que firmar transacciones de escritura repetidamente ni pagar costos de gas, el servidor de NotarIA actúa como creador y pagador de gas (`$creator`), y mediante `changeOwnership` transfiere inmediatamente la propiedad de la entidad a la wallet descentralizada del profesional (`$owner`).

### 3. Consulta Descentralizada por Atributos (`arkiv_query`)
Durante el proceso de auditoría y verificación en caliente, la aplicación no confía únicamente en el ID de entidad almacenado en su base de datos Supabase (el cual también podría haber sido alterado). En su lugar, realiza una consulta descentralizada directamente al nodo RPC de Arkiv.
* **Funcionamiento:** Envía una solicitud JSON-RPC `arkiv_query` con los filtros `app = "notaria" && type = "clinical_session" && sessionId = "${sessionId}"`. De esta forma, el sistema recupera la `entityKey` correcta directamente de la red Braga de forma autónoma.

### 4. Recuperación de Entidades e Identidad (`getEntity`)
Una vez obtenida la clave de la entidad inmutable, el sistema descarga el payload inmutable desde Arkiv Network para comprobar su validez.
* **Funcionamiento:** Llama a `arkivPublicClient.getEntity(entityKey)` para obtener el payload. Compara el campo `hash` de los datos de la red con el hash obtenido al reconstruir localmente la conversación con los mensajes actuales de Supabase. Adicionalmente, recupera el campo `owner` de la entidad para mostrar en la interfaz de auditoría el médico firmante responsable de la sesión.

---

## 📄 Licencia
Este proyecto se distribuye bajo la Licencia MIT.

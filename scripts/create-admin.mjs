import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env')
let envContent = ''
try {
  envContent = fs.readFileSync(envPath, 'utf8')
} catch (err) {
  console.error('Error al leer el archivo .env:', err)
  process.exit(1)
}

const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    const key = match[1]
    let value = match[2] || ''
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1)
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1)
    }
    env[key] = value.trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  console.log('Creando usuario admin en Supabase Auth...')
  const email = 'admin@example.com'
  const password = 'admin1234'
  
  // 1. Create Auth user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Administrador Demo',
      role: 'admin',
      institution: 'Hospital de la Puna'
    }
  })

  if (userError) {
    if (userError.message.includes('already registered') || userError.message.includes('already exists')) {
      console.log('El usuario ya existe. Actualizando contraseña...')
      
      const { data: listUsers, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error('Error al listar usuarios:', listError)
        process.exit(1)
      }
      const existingUser = listUsers.users.find(u => u.email === email)
      if (existingUser) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
          password: password,
          user_metadata: {
            full_name: 'Administrador Demo',
            role: 'admin',
            institution: 'Hospital de la Puna'
          }
        })
        if (updateError) {
          console.error('Error al actualizar contraseña:', updateError)
        } else {
          console.log('Contraseña actualizada con éxito.')
          
          console.log('Verificando perfil en base de datos...')
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: existingUser.id,
              full_name: 'Administrador Demo',
              role: 'admin',
              institution: 'Hospital de la Puna',
              updated_at: new Date().toISOString()
            })
          if (profileError) {
            console.error('Error al actualizar perfil en tabla profiles:', profileError)
          } else {
            console.log('Perfil actualizado en la tabla profiles.')
          }
        }
      }
    } else {
      console.error('Error al crear usuario auth:', userError)
    }
    process.exit(0)
  }

  console.log('Usuario de auth creado con éxito:', userData.user?.id)

  if (userData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userData.user.id,
        full_name: 'Administrador Demo',
        role: 'admin',
        institution: 'Hospital de la Puna',
        updated_at: new Date().toISOString()
      })
    
    if (profileError) {
      console.error('Error al insertar en profiles:', profileError)
    } else {
      console.log('Perfil insertado en la tabla profiles con éxito.')
    }
  }
}

run().catch(console.error)

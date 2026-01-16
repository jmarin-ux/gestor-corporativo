'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function RegistroAdmin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // AQUÍ VA LA FUNCIÓN QUE ME PASASTE
  const crearUsuario = async () => {
    setLoading(true)
    setMsg('Creando acceso...')
    
    // 1) Crear el usuario en Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
    })

    if (authError) {
      setMsg('Error en Auth: ' + authError.message)
      setLoading(false)
      return
    }

    const userId = data.user?.id

    // 2) ACTUALIZAR el perfil que ya existe (buscando por email)
    // Esto vincula el nuevo UUID al registro que ya tenías en la tabla profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        user_id: userId,     // El nuevo ID (UUID) que viene de Auth
        full_name: fullName, 
        role: 'superadmin',
        status: 'active',
      })
      .eq('email', email.trim()) // Busca la fila donde el email coincida

    if (profileError) {
      setMsg('Auth creado, pero no se pudo vincular el perfil: ' + profileError.message)
    } else {
      setMsg('✅ Usuario vinculado al perfil existente con éxito')
      // Opcional: limpiar campos
      setEmail(''); setPassword(''); setFullName('')
    }
    
    setLoading(false)
  }

  // EL "HTML" (JSX) QUE RENDERIZA LA PÁGINA
  return (
    <div style={{ padding: 40, maxWidth: '400px', fontFamily: 'sans-serif' }}>
      <h2>Registro de Administrador</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          placeholder="Nombre completo"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          style={{ padding: '8px' }}
        />
        
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: '8px' }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ padding: '8px' }}
        />

        <button 
          onClick={crearUsuario} 
          disabled={loading}
          style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {loading ? 'Procesando...' : 'Vincular Usuario y Perfil'}
        </button>
      </div>

      <p style={{ marginTop: '20px', color: msg.includes('✅') ? 'green' : 'red' }}>
        {msg}
      </p>
    </div>
  )
}
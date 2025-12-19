import React, { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import { loginUser, registerUser, getCurrentUser, logoutUser } from '../services/users'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Función para normalizar datos de usuario
  const normalizeUserData = (userData) => {
    if (!userData) return null;
    
    // Asegurar que barberId esté presente para admins peluqueros
    if (userData.type === 'admin') {
      // Si no tiene barberId, intentar determinarlo por email o username
      if (!userData.barberId) {
        const email = (userData.email || '').toLowerCase();
        const username = (userData.username || '').toLowerCase();
        
        if (email.includes('santiago') || username === 'santi') {
          userData.barberId = 'santi';
          userData.barberName = 'Santiago';
        } else if (email.includes('mili') || username === 'mili') {
          userData.barberId = 'mili';
          userData.barberName = 'Mili';
        }
      }
    }
    
    return userData;
  };

  // Cargar usuario desde Firebase al iniciar
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('🔄 AuthProvider: Cargando usuario...')
        const currentUser = await getCurrentUser()
        
        if (currentUser) {
          const normalizedUser = normalizeUserData(currentUser);
          console.log('✅ AuthProvider: Usuario cargado:', {
            username: normalizedUser.username,
            email: normalizedUser.email,
            barberId: normalizedUser.barberId,
            type: normalizedUser.type
          })
          setUser(normalizedUser)
        } else {
          console.log('ℹ️ AuthProvider: No hay usuario autenticado')
          setUser(null)
        }
      } catch (error) {
        console.error('❌ AuthProvider: Error cargando usuario:', error)
        setError(error.message)
        setUser(null)
      } finally {
        console.log('🏁 AuthProvider: Carga completada')
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (identifier, password, rememberMe = false) => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔐 AuthProvider: Iniciando login para:', identifier)
      const result = await loginUser(identifier, password)
      
      if (result.success) {
        // Normalizar datos del usuario
        const normalizedUser = normalizeUserData(result.user);
        
        // Guardar preferencia de "rememberMe" si es necesario
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', identifier)
        } else {
          localStorage.removeItem('rememberedUsername')
        }
        
        console.log('✅ AuthProvider: Login exitoso, usuario:', {
          username: normalizedUser.username,
          barberId: normalizedUser.barberId,
          type: normalizedUser.type
        })
        
        setUser(normalizedUser)
        result.user = normalizedUser; // Actualizar resultado con datos normalizados
      } else {
        setError(result.error)
      }
      
      return result
      
    } catch (error) {
      const errorMsg = error.message || 'Error en el login'
      setError(errorMsg)
      return { 
        success: false, 
        error: errorMsg
      }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    setLoading(true)
    setError(null)
    try {
      const result = await registerUser(userData)
      if (result.success) {
        const normalizedUser = normalizeUserData(result.user);
        setUser(normalizedUser)
      } else {
        setError(result.error)
      }
      return result
    } catch (error) {
      const errorMsg = error.message || 'Error en el registro'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await logoutUser()
      setUser(null)
      setError(null)
      console.log('👋 AuthProvider: Logout exitoso')
      return { success: true }
    } catch (error) {
      const errorMsg = error.message || 'Error en logout'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.type === 'admin'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
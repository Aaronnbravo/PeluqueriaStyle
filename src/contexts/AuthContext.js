import { createContext } from 'react'

// Crear el contexto de autenticación
export const AuthContext = createContext()

// No necesitamos exportar nada más desde este archivo
// Solo el contexto para que pueda ser usado por useAuth.js y AuthProvider.jsx
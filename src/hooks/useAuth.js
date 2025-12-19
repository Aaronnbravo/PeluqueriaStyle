import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  
  // Agregar función para obtener barberId
  const getBarberId = () => {
    if (!context.user) return null;
    
    // Prioridad: barberId del documento de usuario
    if (context.user.barberId) {
      return context.user.barberId;
    }
    
    // Si no tiene barberId, usar el email para determinar
    if (context.user.email) {
      // Mapear emails a barberId
      const email = context.user.email.toLowerCase();
      if (email.includes('santiago') || email.includes('santi')) {
        return 'santi';
      } else if (email.includes('mili')) {
        return 'mili';
      }
    }
    
    // Si es admin y no tiene barberId asignado
    if (context.user.type === 'admin') {
      // Por defecto, devolver null (será tratado como super admin)
      return null;
    }
    
    return null;
  };
  
  // Función para obtener nombre del peluquero
  const getBarberName = () => {
    const barberId = getBarberId();
    if (barberId === 'santi') return 'Santiago';
    if (barberId === 'mili') return 'Mili';
    return null;
  };
  
  return {
    ...context,
    getBarberId,
    getBarberName,
    barberId: getBarberId(), // Propiedad conveniente
    barberName: getBarberName() // Propiedad conveniente
  }
}
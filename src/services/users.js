import { 
  collection, 
  getDocs, 
  query, 
  where,
  addDoc,
  updateDoc,
  doc,
  Timestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'

const auth = getAuth()

// ========== FUNCIONES DE AUTENTICACIÓN ==========

// Login de usuario - SEPARADO PARA ADMINS Y CLIENTES
export const loginUser = async (identifier, password) => {
  try {
    console.log('🔐 Intentando login con:', identifier)
    
    // PRIMERO: Verificar si es un ADMIN (solo username exacto)
    const adminUsernames = ['Admin', 'MiliAdmin']
    
    if (adminUsernames.includes(identifier)) {
      console.log('👑 Intentando login como ADMIN:', identifier)
      
      // Buscar admin por username exacto
      const usersRef = collection(db, 'Users')
      const adminQuery = query(usersRef, where('username', '==', identifier))
      const adminSnapshot = await getDocs(adminQuery)
      
      if (adminSnapshot.empty) {
        console.log('❌ Admin no encontrado en Firestore')
        return {
          success: false,
          error: 'Administrador no encontrado'
        }
      }
      
      const adminDoc = adminSnapshot.docs[0]
      const adminData = adminDoc.data()
      
      console.log('🔑 Comparando contraseña admin...')
      
      // Verificar contraseña del admin (texto plano)
      if (adminData.password === password) {
        console.log('✅ Contraseña correcta para admin')
        
        // Intentar login con Firebase Auth si tiene email
        if (adminData.email) {
          try {
            await signInWithEmailAndPassword(auth, adminData.email, password)
            console.log('✅ Firebase Auth login exitoso para admin')
          } catch (firebaseError) {
            console.log('⚠️ Firebase Auth falló para admin:', firebaseError.message)
            // Continuamos con login manual
          }
        }
        
        // Preparar datos del admin con barberName
        const adminToReturn = {
          id: adminDoc.id,
          ...adminData
        }
        
        // Asegurar barberName
        if (adminData.barberId && !adminData.barberName) {
          adminToReturn.barberName = adminData.barberId === 'santi' ? 'Santiago' : 
                                     adminData.barberId === 'mili' ? 'Mili' : 
                                     adminData.firstName || 'Administrador'
        }
        
        return {
          success: true,
          user: adminToReturn,
          message: 'Login de administrador exitoso'
        }
      } else {
        console.log('❌ Contraseña incorrecta para admin')
        return {
          success: false,
          error: 'Contraseña incorrecta'
        }
      }
    }
    
    // SEGUNDO: Si no es admin, es CLIENTE (buscar por username O documento)
    console.log('👤 Intentando login como CLIENTE:', identifier)
    
    const usersRef = collection(db, 'Users')
    
    // Buscar cliente por username
    let userQuery = query(usersRef, where('username', '==', identifier))
    let querySnapshot = await getDocs(userQuery)
    
    // Si no encuentra por username, buscar por documento
    if (querySnapshot.empty) {
      userQuery = query(usersRef, where('document', '==', identifier))
      querySnapshot = await getDocs(userQuery)
    }
    
    if (querySnapshot.empty) {
      console.log('❌ Cliente no encontrado (ni por username ni documento)')
      return {
        success: false,
        error: 'Usuario o DNI no encontrado'
      }
    }
    
    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    
    // Verificar que sea cliente (no admin que intenta loguearse mal)
    if (userData.type === 'admin') {
      console.log('❌ Cliente intentando usar método de admin')
      return {
        success: false,
        error: 'Para administradores, use su username exacto (Admin o MiliAdmin)'
      }
    }
    
    console.log('🔑 Comparando contraseña cliente...')
    
    // Verificar contraseña del cliente (texto plano)
    if (userData.password === password) {
      console.log('✅ Contraseña correcta para cliente')
      
      // Intentar login con Firebase Auth si tiene email
      if (userData.email) {
        try {
          await signInWithEmailAndPassword(auth, userData.email, password)
          console.log('✅ Firebase Auth login exitoso para cliente')
        } catch (firebaseError) {
          console.log('⚠️ Firebase Auth falló para cliente:', firebaseError.message)
          // Continuamos con login manual
        }
      }
      
      return {
        success: true,
        user: {
          id: userDoc.id,
          ...userData
        },
        message: 'Login de cliente exitoso'
      }
    } else {
      console.log('❌ Contraseña incorrecta para cliente')
      return {
        success: false,
        error: 'Contraseña incorrecta'
      }
    }
    
  } catch (error) {
    console.error('❌ Error en loginUser:', error)
    return {
      success: false,
      error: error.message || 'Error en el servidor'
    }
  }
}

// Registrar nuevo usuario (solo para clientes)
export const registerUser = async (userData) => {
  try {
    console.log('📝 Registrando NUEVO CLIENTE:', userData.username)
    
    // Verificar si el username ya existe
    const usersRef = collection(db, 'Users')
    
    const usernameQuery = query(usersRef, where('username', '==', userData.username))
    const usernameSnapshot = await getDocs(usernameQuery)
    
    if (!usernameSnapshot.empty) {
      return {
        success: false,
        error: 'El nombre de usuario ya está en uso'
      }
    }
    
    // Verificar si el documento ya existe
    if (userData.document) {
      const documentQuery = query(usersRef, where('document', '==', userData.document))
      const documentSnapshot = await getDocs(documentQuery)
      
      if (!documentSnapshot.empty) {
        return {
          success: false,
          error: 'El documento ya está registrado'
        }
      }
    }
    
    // Crear usuario cliente en Firestore
    const newUser = {
      ...userData,
      type: 'client', // SIEMPRE cliente
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const docRef = await addDoc(usersRef, newUser)
    
    console.log('✅ Cliente registrado exitosamente en Firestore')
    
    return {
      success: true,
      user: {
        id: docRef.id,
        ...newUser
      },
      message: 'Cliente registrado exitosamente'
    }
    
  } catch (error) {
    console.error('❌ Error en registerUser:', error)
    return {
      success: false,
      error: error.message || 'Error al registrar cliente'
    }
  }
}

// Obtener usuario actual
export const getCurrentUser = async () => {
  try {
    console.log('👤 Obteniendo usuario actual...')
    
    // PRIMERO: Intentar obtener de Firebase Auth
    const authUser = auth.currentUser
    
    if (authUser && authUser.email) {
      console.log('✅ Usuario de Firebase Auth encontrado:', authUser.email)
      
      // Buscar en Firestore por email
      const usersRef = collection(db, 'Users')
      const userQuery = query(usersRef, where('email', '==', authUser.email))
      const querySnapshot = await getDocs(userQuery)
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        const userData = userDoc.data()
        
        // Asegurar barberName para admins
        if (userData.type === 'admin' && userData.barberId && !userData.barberName) {
          userData.barberName = userData.barberId === 'santi' ? 'Santiago' : 
                                userData.barberId === 'mili' ? 'Mili' : 
                                userData.firstName || 'Administrador'
        }
        
        return {
          id: userDoc.id,
          ...userData
        }
      }
    }
    
    // SEGUNDO: Intentar obtener de localStorage (fallback)
    const storedUser = localStorage.getItem('adminUser') || localStorage.getItem('user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        console.log('✅ Usuario de localStorage:', parsedUser.username)
        
        // Asegurar barberName para admins
        if (parsedUser.type === 'admin' && parsedUser.barberId && !parsedUser.barberName) {
          parsedUser.barberName = parsedUser.barberId === 'santi' ? 'Santiago' : 
                                  parsedUser.barberId === 'mili' ? 'Mili' : 
                                  parsedUser.firstName || 'Administrador'
        }
        
        return parsedUser
      } catch (e) {
        console.log('❌ Error parseando usuario de localStorage')
      }
    }
    
    console.log('ℹ️ No hay usuario autenticado')
    return null
    
  } catch (error) {
    console.error('❌ Error en getCurrentUser:', error)
    return null
  }
}

// Cerrar sesión
export const logoutUser = async () => {
  try {
    // Cerrar sesión en Firebase Auth
    await signOut(auth)
    
    // Limpiar localStorage
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    localStorage.removeItem('user')
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('rememberedUsername')
    
    console.log('✅ Logout exitoso')
    return { success: true }
    
  } catch (error) {
    console.error('❌ Error en logoutUser:', error)
    return { success: false, error: error.message }
  }
}

// Verificar si username está disponible (para clientes)
export const isUsernameTaken = async (username) => {
  try {
    const usersRef = collection(db, 'Users')
    const q = query(usersRef, where('username', '==', username))
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error) {
    console.error('Error verificando username:', error)
    return true // Por seguridad, asumir que está tomado
  }
}

// Verificar si documento está disponible (para clientes)
export const isDocumentTaken = async (document) => {
  try {
    const usersRef = collection(db, 'Users')
    const q = query(usersRef, where('document', '==', document))
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error) {
    console.error('Error verificando documento:', error)
    return true
  }
}

// Actualizar perfil de usuario
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'Users', userId)
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    })
    return { success: true }
  } catch (error) {
    console.error('Error actualizando perfil:', error)
    return { success: false, error: error.message }
  }
}

// Buscar usuarios (para admin)
export const searchUsers = async (searchTerm) => {
  try {
    const usersRef = collection(db, 'Users')
    const clientQuery = query(usersRef, where('type', '==', 'client'))
    const querySnapshot = await getDocs(clientQuery)
    
    const results = []
    const searchLower = searchTerm.toLowerCase()
    
    querySnapshot.forEach(doc => {
      const userData = doc.data()
      
      if (
        (userData.username && userData.username.toLowerCase().includes(searchLower)) ||
        (userData.email && userData.email.toLowerCase().includes(searchLower)) ||
        (userData.firstName && userData.firstName.toLowerCase().includes(searchLower)) ||
        (userData.lastName && userData.lastName.toLowerCase().includes(searchLower)) ||
        (userData.document && userData.document.includes(searchTerm))
      ) {
        results.push({
          id: doc.id,
          ...userData
        })
      }
    })
    
    return results
  } catch (error) {
    console.error('Error buscando usuarios:', error)
    return []
  }
}

// Crear usuario admin (para desarrollo)
export const createAdminUser = async (adminData) => {
  try {
    const { username, email, password, barberId, firstName, lastName } = adminData
    
    // Verificar si ya existe
    const existingQuery = query(
      collection(db, 'Users'),
      where('username', '==', username)
    )
    const existingSnapshot = await getDocs(existingQuery)
    
    if (!existingSnapshot.empty) {
      return {
        success: false,
        error: 'El usuario admin ya existe'
      }
    }
    
    const adminUser = {
      username,
      email,
      password,
      type: 'admin',
      barberId,
      firstName,
      lastName,
      phone: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const docRef = await addDoc(collection(db, 'Users'), adminUser)
    
    return {
      success: true,
      user: {
        id: docRef.id,
        ...adminUser
      }
    }
    
  } catch (error) {
    console.error('Error creando admin:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Obtener todos los clientes (para admin)
export const getAllClients = async () => {
  try {
    const usersRef = collection(db, 'Users')
    const clientQuery = query(usersRef, where('type', '==', 'client'))
    const querySnapshot = await getDocs(clientQuery)
    
    const clients = []
    querySnapshot.forEach(doc => {
      clients.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    return clients
  } catch (error) {
    console.error('Error obteniendo clientes:', error)
    return []
  }
}

// Agrega esta función en users.js (justo después de las funciones existentes)

// Recuperar contraseña - Verificar documento y usuario
export const verifyUserForPasswordRecovery = async (username, document) => {
  try {
    console.log('🔍 Verificando usuario para recuperación:', { username, document });
    
    const usersRef = collection(db, 'Users');
    
    // Buscar por username
    let userQuery = query(usersRef, where('username', '==', username));
    let querySnapshot = await getDocs(userQuery);
    
    // Si no encuentra por username, buscar por documento
    if (querySnapshot.empty) {
      userQuery = query(usersRef, where('document', '==', document));
      querySnapshot = await getDocs(userQuery);
      
      if (querySnapshot.empty) {
        console.log('❌ No se encontró usuario (ni por username ni documento)');
        return {
          success: false,
          error: 'Usuario o documento no encontrado'
        };
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Verificar que el documento coincida
      if (userData.document !== document) {
        return {
          success: false,
          error: 'Documento no coincide'
        };
      }
    } else {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Verificar que el documento coincida
      if (userData.document !== document) {
        return {
          success: false,
          error: 'Documento no coincide con el usuario'
        };
      }
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    console.log('✅ Usuario verificado correctamente:', userData.username);
    
    return {
      success: true,
      userId: userDoc.id,
      username: userData.username,
      email: userData.email || '',
      message: 'Usuario verificado exitosamente'
    };
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    return {
      success: false,
      error: error.message || 'Error en la verificación'
    };
  }
};

// Actualizar contraseña de usuario
export const updateUserPassword = async (userId, newPassword) => {
  try {
    console.log('🔐 Actualizando contraseña para usuario ID:', userId);
    
    const userRef = doc(db, 'Users', userId);
    
    // Actualizar solo la contraseña en Firestore
    await updateDoc(userRef, {
      password: newPassword, // En una app real, deberías encriptar esto
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Contraseña actualizada exitosamente');
    
    return {
      success: true,
      message: 'Contraseña actualizada exitosamente'
    };
    
  } catch (error) {
    console.error('❌ Error actualizando contraseña:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar contraseña'
    };
  }
};
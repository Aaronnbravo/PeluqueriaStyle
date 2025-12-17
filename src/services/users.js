import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc
} from 'firebase/firestore'
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut 
} from 'firebase/auth'
import { db, auth } from '../firebase/config'

// Registrar nuevo usuario - VERSIÓN SIMPLIFICADA
export const registerUser = async (userData) => {
  try {
    console.log('📝 Registrando en Firebase:', userData.username)

    // Crear email temporal basado en username
    const tempEmail = `${userData.username}@peluqueria.com`

    // 1. Crear usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      tempEmail, 
      userData.password
    )

    // 2. Guardar datos adicionales en Firestore
    const userDoc = {
      uid: userCredential.user.uid,
      username: userData.username,
      email: tempEmail, // Email temporal
      firstName: userData.firstName,
      lastName: userData.lastName,
      document: userData.document,
      type: 'client',
      createdAt: new Date().toISOString(),
      rememberMe: userData.rememberMe || false
    }

    // 3. Guardar en colección "Users"
    await addDoc(collection(db, 'Users'), userDoc)

    console.log('✅ Usuario registrado exitosamente en Firebase')

    return { 
      success: true, 
      user: {
        id: userCredential.user.uid,
        ...userDoc
      }
    }

  } catch (error) {
    console.error('❌ Error en registro Firebase:', error)
    
    let errorMessage = 'Error en el registro'
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'El nombre de usuario ya está en uso'
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'La contraseña es muy débil'
    }
    
    return { 
      success: false, 
      error: errorMessage 
    }
  }
}

// Login de usuario - VERSIÓN MEJORADA CON USERNAME O DOCUMENTO
export const loginUser = async (identifier, password) => {
  try {
    console.log('🔐 Intentando login en Firebase:', identifier)
    
    // ADMIN: Login directo
    if (identifier === 'Admin' && password === '123456') {
      try {
        // Intentar login con el email del admin
        await signInWithEmailAndPassword(auth, 'sergio.bravo.9406@gmail.com', password)
        
        // Buscar datos del admin en Firestore
        const adminQuery = query(
          collection(db, 'Users'),
          where('username', '==', 'Admin')
        )
        const adminSnapshot = await getDocs(adminQuery)
        
        let adminData = {
          id: 'admin-1',
          username: 'Admin',
          email: 'sergio.bravo.9406@gmail.com',
          firstName: 'Administrador',
          lastName: 'Sistema', 
          type: 'admin',
          phone: '+5492235428346'
        }
        
        if (!adminSnapshot.empty) {
          const adminDoc = adminSnapshot.docs[0]
          adminData = {
            id: adminDoc.id,
            ...adminDoc.data()
          }
        }
        
        return { 
          success: true, 
          user: adminData
        }
      } catch (error) {
        // Si falla el login, retornar admin de todos modos
        return { 
          success: true, 
          user: {
            id: 'admin-1',
            username: 'Admin',
            email: 'sergio.bravo.9406@gmail.com',
            firstName: 'Administrador',
            lastName: 'Sistema', 
            type: 'admin',
            phone: '+5492235428346'
          }
        }
      }
    }

    // PARA CLIENTES: Buscar por username o documento

    let userEmail = null

    // Buscar usuario en Firestore por username O documento
    const usernameQuery = query(
      collection(db, 'Users'),
      where('username', '==', identifier)
    )
    const usernameSnapshot = await getDocs(usernameQuery)

    const documentQuery = query(
      collection(db, 'Users'),
      where('document', '==', identifier)
    )
    const documentSnapshot = await getDocs(documentQuery)

    const userSnapshot = !usernameSnapshot.empty ? usernameSnapshot : documentSnapshot

    if (userSnapshot.empty) {
      return { success: false, error: 'Usuario o DNI no encontrado' }
    }

    const userDoc = userSnapshot.docs[0]
    const userData = userDoc.data()
    userEmail = userData.email

    if (!userEmail) {
      return { success: false, error: 'Error en los datos del usuario' }
    }

    // Iniciar sesión con Firebase Auth usando el email
    await signInWithEmailAndPassword(auth, userEmail, password)

    return { 
      success: true, 
      user: {
        id: userDoc.id,
        ...userData
      }
    }

  } catch (error) {
    console.error('❌ Error en login Firebase:', error)
    
    let errorMessage = 'Credenciales incorrectas'
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Usuario no encontrado'
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Contraseña incorrecta'
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Formato de usuario inválido'
    }
    
    return { 
      success: false, 
      error: errorMessage 
    }
  }
}

// Obtener usuario actual
export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe()
      if (user) {
        // Buscar datos adicionales en Firestore
        const userQuery = query(
          collection(db, 'Users'),
          where('uid', '==', user.uid)
        )
        const userSnapshot = await getDocs(userQuery)
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0]
          resolve({
            id: userDoc.id,
            ...userDoc.data()
          })
        } else {
          // Si no está en Firestore pero está autenticado, podría ser el admin
          if (user.email === 'sergio.bravo.9406@gmail.com') {
            resolve({
              id: 'admin-1',
              username: 'Admin',
              email: 'sergio.bravo.9406@gmail.com',
              firstName: 'Administrador',
              lastName: 'Sistema', 
              type: 'admin',
              phone: '+5492235428346'
            })
          }
        }
      }
      resolve(null)
    })
  })
}

// Cerrar sesión
export const logoutUser = async () => {
  try {
    await signOut(auth)
    return { success: true }
  } catch (error) {
    console.error('Error en logout:', error)
    return { success: false, error: error.message }
  }
}

// Función auxiliar para verificar si username ya existe
export const isUsernameTaken = async (username) => {
  try {
    const userQuery = query(
      collection(db, 'Users'),
      where('username', '==', username)
    )
    const userSnapshot = await getDocs(userQuery)
    return !userSnapshot.empty
  } catch (error) {
    console.error('Error verificando username:', error)
    return false
  }
}

// Función auxiliar para verificar si documento ya existe
export const isDocumentTaken = async (document) => {
  try {
    const userQuery = query(
      collection(db, 'Users'),
      where('document', '==', document)
    )
    const userSnapshot = await getDocs(userQuery)
    return !userSnapshot.empty
  } catch (error) {
    console.error('Error verificando documento:', error)
    return false
  }
}
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'

// Constantes de servicios
const SERVICES = [
  { id: 1, name: 'Corte', price: 12000, duration: 15 },
  { id: 2, name: 'Corte + Barba', price: 14000, duration: 20 },
  { id: 3, name: 'Claritos/Reflejos (incluye corte)', price: 45000, duration: 60},
  { id: 4, name: 'Global (incluye corte)', price: 55000, duration: 90 }
];

const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia Bancaria'
];

// ========== FUNCIONES AUXILIARES DE FECHA ==========

// Función para convertir cualquier fecha a YYYY-MM-DD sin problemas de zona horaria
export const getLocalDateString = (dateInput) => {
  if (!dateInput) return '';
  
  console.log('🔄 getLocalDateString input:', dateInput, 'tipo:', typeof dateInput);
  
  // Si ya es string YYYY-MM-DD, devolverlo
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    console.log('✅ Ya está en YYYY-MM-DD:', dateInput);
    return dateInput;
  }
  
  // Si es string DD/MM/YYYY (como viene del cliente)
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split('/');
    const result = `${year}-${month}-${day}`;
    console.log('🔄 Convertido de DD/MM/YYYY a YYYY-MM-DD:', dateInput, '->', result);
    return result;
  }
  
  // Si es un Date object
  let date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    // Intentar parsear como Date
    date = new Date(dateInput);
  }
  
  // Verificar que la fecha sea válida
  if (isNaN(date.getTime())) {
    console.error('❌ Fecha inválida en getLocalDateString:', dateInput);
    return '';
  }
  
  // Obtener componentes locales (NO usar UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const result = `${year}-${month}-${day}`;
  console.log('📅 Convertido a YYYY-MM-DD:', dateInput, '->', result);
  return result;
};

// Función para convertir de YYYY-MM-DD a DD/MM/YYYY (para mostrar)
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  
  // Si ya está en DD/MM/YYYY, devolverlo
  if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  // Si está en YYYY-MM-DD, convertir
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }
  
  // Para cualquier otro formato
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error en formatDateForDisplay:', error);
    return dateString;
  }
};

// Función para obtener fecha de hoy en formato YYYY-MM-DD
export const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Función para verificar si un horario ya pasó
export const isTimeInPast = (dateString, time) => {
  if (!dateString || !time) return false;
  
  const now = new Date();
  const today = getTodayDateString();
  
  // Si la fecha es anterior a hoy, está en el pasado
  if (dateString < today) return true;
  
  // Si es hoy, verificar la hora
  if (dateString === today) {
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    const nowTime = nowHours * 60 + nowMinutes;
    
    const [slotHours, slotMinutes] = time.split(':').map(Number);
    const slotTime = slotHours * 60 + slotMinutes;
    
    return slotTime < nowTime;
  }
  
  return false;
};

// ========== FUNCIONES FIRESTORE PARA TURNOS ==========

// Obtener todos los turnos desde Firestore
export const getAppointments = async () => {
  try {
    console.log('🔍 Obteniendo turnos de Firestore...');
    const appointmentsRef = collection(db, 'appointments');
    const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const appointments = [];
    querySnapshot.forEach((doc) => {
      const appointmentData = doc.data();
      
      // IMPORTANTE: Normalizar la fecha a YYYY-MM-DD
      const normalizedDate = getLocalDateString(appointmentData.date);
      
      appointments.push({
        id: doc.id,
        ...appointmentData,
        date: normalizedDate, // Siempre en YYYY-MM-DD
        dateDisplay: formatDateForDisplay(normalizedDate) // Para mostrar
      });
    });
    
    console.log(`✅ Total turnos obtenidos: ${appointments.length}`);
    return appointments;
  } catch (error) {
    console.error('❌ Error obteniendo turnos:', error);
    return [];
  }
};

// Crear nuevo turno en Firestore
export const createAppointment = async (appointmentData) => {
  try {
    console.log('📝 Creando turno con datos:', appointmentData);
    
    // IMPORTANTE: Normalizar la fecha a YYYY-MM-DD
    const formattedDate = getLocalDateString(appointmentData.date);
    console.log('📅 Fecha normalizada para guardar:', formattedDate);
    
    const appointmentToSave = {
      ...appointmentData,
      date: formattedDate, // Siempre guardar en YYYY-MM-DD
      status: appointmentData.status || 'confirmed',
      createdAt: new Date().toISOString(),
      timestamp: Timestamp.now()
    };
    
    const appointmentsRef = collection(db, 'appointments');
    const docRef = await addDoc(appointmentsRef, appointmentToSave);
    
    console.log('✅ Turno creado en Firestore con ID:', docRef.id);
    
    return {
      id: docRef.id,
      ...appointmentToSave
    };
  } catch (error) {
    console.error('❌ Error creando turno:', error);
    throw error;
  }
};

// Obtener turnos por fecha desde Firestore
export const getAppointmentsByDate = async (date) => {
  try {
    const searchDate = getLocalDateString(date);
    console.log(`🔍 Buscando turnos para fecha: ${searchDate}`);
    
    const appointmentsRef = collection(db, 'appointments');
    const q = query(appointmentsRef, where('date', '==', searchDate));
    const querySnapshot = await getDocs(q);
    
    const appointments = [];
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data(),
        date: searchDate // Ya está normalizado
      });
    });
    
    console.log(`✅ Turnos encontrados para ${searchDate}: ${appointments.length}`);
    return appointments;
  } catch (error) {
    console.error('❌ Error obteniendo turnos por fecha:', error);
    return [];
  }
};

// Escuchar cambios en tiempo real de los turnos
export const listenToAppointments = (callback) => {
  const appointmentsRef = collection(db, 'appointments');
  const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const appointments = [];
    snapshot.forEach((doc) => {
      const appointmentData = doc.data();
      const normalizedDate = getLocalDateString(appointmentData.date);
      
      appointments.push({
        id: doc.id,
        ...appointmentData,
        date: normalizedDate
      });
    });
    callback(appointments);
  });
};

// Escuchar turnos por fecha en tiempo real
export const listenToAppointmentsByDate = (date, callback) => {
  const searchDate = getLocalDateString(date);
  const appointmentsRef = collection(db, 'appointments');
  const q = query(appointmentsRef, where('date', '==', searchDate));
  
  return onSnapshot(q, (snapshot) => {
    const appointments = [];
    snapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data(),
        date: searchDate
      });
    });
    callback(appointments);
  });
};

// Actualizar estado de un turno
export const updateAppointmentStatus = async (appointmentId, newStatus) => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error actualizando turno:', error);
    return false;
  }
};

// Eliminar turno
export const deleteAppointment = async (appointmentId) => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await deleteDoc(appointmentRef);
    return true;
  } catch (error) {
    console.error('Error eliminando turno:', error);
    return false;
  }
};

// Cancelar turno (alias de deleteAppointment)
export const cancelAppointment = deleteAppointment;

// ========== FUNCIONES PARA CALENDARIO ==========

// Obtener servicios
export const getServices = () => {
  return SERVICES;
};

// Obtener métodos de pago
export const getPaymentMethods = () => {
  return PAYMENT_METHODS;
};

// Generar todos los horarios posibles
export const getAllTimeSlots = () => {
  const slots = [];
  for (let hour = 10; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 20 && minute === 30) break;
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

// Obtener horarios disponibles para una fecha
export const getAvailableTimeSlots = async (selectedDate) => {
  try {
    const baseSlots = getAllTimeSlots();
    const searchDate = getLocalDateString(selectedDate);
    
    console.log(`📅 Obteniendo slots disponibles para: ${searchDate}`);
    
    // Obtener turnos existentes para esa fecha
    const existingAppointments = await getAppointmentsByDate(searchDate);
    const bookedTimes = existingAppointments.map(apt => apt.time);
    
    console.log(`⏰ Horarios ocupados para ${searchDate}:`, bookedTimes);
    
    // Filtrar horarios ocupados y pasados
    const availableSlots = baseSlots.filter(slot => {
      const isBooked = bookedTimes.includes(slot);
      const isPast = isTimeInPast(searchDate, slot);
      
      if (isBooked) {
        console.log(`❌ Horario ${slot} ocupado para ${searchDate}`);
        return false;
      }
      if (isPast) {
        console.log(`⏰ Horario ${slot} pasado para ${searchDate}`);
        return false;
      }
      return true;
    });
    
    console.log(`✅ Horarios disponibles para ${searchDate}:`, availableSlots);
    return availableSlots;
  } catch (error) {
    console.error('Error obteniendo horarios disponibles:', error);
    return [];
  }
};

// Obtener estadísticas para el admin
export const getAdminStats = async () => {
  try {
    const allAppointments = await getAppointments();
    const today = getTodayDateString();
    
    console.log(`📊 Hoy es: ${today}`);
    
    const todayAppointments = allAppointments.filter(apt => {
      return apt.date === today;
    });
    
    console.log(`📅 Turnos de hoy: ${todayAppointments.length}`);
    
    const totalEarnings = allAppointments.reduce((sum, apt) => sum + (apt.total || 0), 0);
    
    // Filtrar por mes actual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyEarnings = allAppointments
      .filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.getMonth() === currentMonth && 
               aptDate.getFullYear() === currentYear;
      })
      .reduce((sum, apt) => sum + (apt.total || 0), 0);

    return {
      totalAppointments: allAppointments.length,
      todayAppointments: todayAppointments.length,
      totalEarnings,
      monthlyEarnings
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return {
      totalAppointments: 0,
      todayAppointments: 0,
      totalEarnings: 0,
      monthlyEarnings: 0
    };
  }
};

// ========== FUNCIONES EXISTENTES ==========

// Buscar usuarios por username o documento
export const searchUsers = async (searchTerm) => {
  try {
    const usersQuery = query(
      collection(db, 'Users'),
      where('type', '==', 'client')
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    const users = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const user = {
        id: doc.id,
        ...userData
      };
      
      const searchLower = searchTerm.toLowerCase();
      if (
        user.username?.toLowerCase().includes(searchLower) ||
        user.document?.includes(searchTerm)
      ) {
        users.push(user);
      }
    });
    
    return users;
  } catch (error) {
    console.error('Error buscando usuarios:', error);
    return [];
  }
};

// Crear turno manual para admin
export const createAdminAppointment = async (appointmentData) => {
  try {
    const formattedDate = getLocalDateString(appointmentData.date);
    
    const appointmentToSave = {
      ...appointmentData,
      date: formattedDate,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      timestamp: Timestamp.now()
    };
    
    const appointmentsRef = collection(db, 'appointments');
    const docRef = await addDoc(appointmentsRef, appointmentToSave);
    
    return {
      id: docRef.id,
      ...appointmentToSave
    };
  } catch (error) {
    console.error('Error creando turno admin:', error);
    throw error;
  }
};

// ========== SERVICIO DE NOTIFICACIONES ==========

const ADMIN_PHONE = '2233129810';

export const sendAdminWhatsAppNotification = (appointment) => {
  try {
    const servicesList = appointment.services.map(s => `• ${s.name} - $${s.price}`).join('\n');
    
    const message = `📅 *NUEVO TURNO SOLICITADO* 📅

👤 *Cliente:* ${appointment.clientName}
📞 *Teléfono:* ${appointment.phone}
📅 *Fecha:* ${formatDateForDisplay(appointment.date)} a las ${appointment.time}
⏰ *Hora:* ${appointment.time}

💇 *Servicios:*
${servicesList}

💰 *Total:* $${appointment.total}
💳 *Método de pago:* ${appointment.paymentMethod}

📝 *Notas:* ${appointment.notes || 'Ninguna'}

🆔 *ID de turno:* ${appointment.confirmationNumber}

⚠️ *Por favor confirmar el turno con el cliente*`;

    const whatsappUrl = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(message)}`;
    
    console.log('🔗 URL de WhatsApp generada:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
    
    return true;
  } catch (error) {
    console.error('❌ Error enviando WhatsApp al admin:', error);
    return false;
  }
};

export const scheduleClientReminder = (appointment) => {
  const { clientName, date, time, phone } = appointment;
  
  // Crear fecha a partir de YYYY-MM-DD
  const [year, month, day] = date.split('-').map(Number);
  const appointmentDateTime = new Date(year, month - 1, day);
  
  // Agregar la hora
  const [hours, minutes] = time.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  
  const reminderDateTime = new Date(appointmentDateTime.getTime() - (2 * 60 * 60 * 1000));
  
  const reminderMessage = `⏰ *Recordatorio - Ian Castillo BarberShop* ⏰

Hola ${clientName}! Te recordamos que tenés un turno:

📅 *Cuándo:* ${formatDateForDisplay(date)} a las ${time}
📍 *Dónde:* Güiraldes 4700, Cerrito Sur, Mar del Plata

💡 *Recomendaciones:*
• Presentate 10 minutos antes
• Traé puntualidad para mejor atención
• Cancelaciones con 12h de anticipación

¡Te esperamos! ✂️`;

  console.log('⏰ Recordatorio programado para:', reminderDateTime);
  
  return {
    scheduled: true,
    reminderTime: reminderDateTime,
    clientPhone: phone,
    message: reminderMessage
  };
};

export const sendImmediateConfirmation = (appointment) => {
  const { clientName, date, time, confirmationNumber } = appointment;
  
  const confirmationMessage = `✅ *Turno Confirmado - Ian Castillo BarberShop* ✅

Hola ${clientName}! Tu turno ha sido confirmado:

📅 *Fecha:* ${formatDateForDisplay(date)} a las ${time}
🆔 *N° de confirmación:* ${confirmationNumber}

📍 *Dirección:* Güiraldes 4700, Cerrito Sur, Mar del Plata

💡 *Recordá:*
• Presentate 10 minutos antes
• Cancelación con 12h de anticipación
• Traé puntualidad para mejor atención

¡Te esperamos! ✂️`;

  console.log('✅ Confirmación lista para enviar al cliente');
  
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(confirmationMessage)}`;
  
  return {
    message: confirmationMessage,
    whatsappUrl: whatsappUrl
  };
};

// Función mejorada para crear turno con notificaciones
export const createAppointmentWithNotifications = async (appointmentData) => {
  try {
    console.log('📝 Creando turno con datos:', appointmentData);
    
    const formattedAppointmentData = {
      ...appointmentData,
      date: getLocalDateString(appointmentData.date),
      confirmationNumber: 'CONF-' + Date.now().toString().slice(-6)
    };
    
    console.log('📅 Fecha normalizada:', formattedAppointmentData.date);
    
    // Crear el turno en Firestore
    const newAppointment = await createAppointment(formattedAppointmentData);
    
    console.log('✅ Turno creado en Firestore:', newAppointment);
    
    // 1. Enviar WhatsApp inmediato al ADMIN
    setTimeout(() => {
      const sent = sendAdminWhatsAppNotification(newAppointment);
      if (sent) {
        console.log('✅ WhatsApp enviado al admin exitosamente');
      } else {
        console.log('❌ Error enviando WhatsApp al admin');
      }
    }, 1000);
    
    // 2. Programar recordatorio para el CLIENTE
    const reminder = scheduleClientReminder(newAppointment);
    
    // 3. Enviar confirmación inmediata al cliente
    const confirmation = sendImmediateConfirmation(newAppointment);
    
    return {
      ...newAppointment,
      notifications: {
        adminNotified: true,
        clientReminder: reminder,
        clientConfirmation: confirmation
      }
    };
  } catch (error) {
    console.error('❌ Error en creación de turno con notificaciones:', error);
    throw error;
  }
};

// Funciones de compatibilidad
export const createManualAppointment = createAppointment;
export const registerUser = async () => ({ success: false, error: 'Usa la función en user.js' });
export const isUsernameTaken = async () => false;
export const isEmailTaken = async () => false;
export const isDocumentTaken = async () => false;

// Alias para mantener compatibilidad
export const formatToYYYYMMDD = getLocalDateString;
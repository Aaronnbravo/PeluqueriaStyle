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

// Constantes de servicios ACTUALIZADOS
const SERVICES = [
  { id: 1, name: 'Corte', price: 15500, duration: 15 },
  { id: 2, name: 'Barba', price: 7000, duration: 10 },
  { id: 3, name: 'Corte + Barba', price: 18500, duration: 25 },
  { id: 4, name: 'Global / Color (Consultar)', price: 0, duration: 90 },
  { id: 5, name: 'Nutrición capilar (Consultar)', price: 0, duration: 60 },
  { id: 6, name: 'Pomada (compra)', price: 10000, duration: 0 }
];

// SOLO TRANSFERENCIA BANCARIA
const PAYMENT_METHODS = [
  'Transferencia Bancaria'
];

// Constantes de peluqueros
const BARBERS = [
  {
    id: 'santi',
    name: 'Santiago',
    image: '/src/images/Barbers/Santuu.jpg',
    interval: 30, // minutos entre turnos
    description: 'Corte clásico y moderno'
  },
  {
    id: 'mili',
    name: 'Mili',
    image: '/src/images/Barbers/Mili.JPG',
    interval: 45, // minutos entre turnos
    description: 'Coloración y estilismo'
  }
];

// ========== FUNCIONES AUXILIARES DE FECHA ==========

// Función para convertir cualquier fecha a YYYY-MM-DD sin problemas de zona horaria
export const getLocalDateString = (dateInput) => {
  if (!dateInput) return '';
  
  // Si ya es string YYYY-MM-DD, devolverlo
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  // Si es string DD/MM/YYYY (como viene del cliente)
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split('/');
    const result = `${year}-${month}-${day}`;
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

// ========== FUNCIONES PARA PELUQUEROS ==========

// Obtener todos los peluqueros
export const getBarbers = () => {
  return BARBERS;
};

// Obtener peluquero por ID
export const getBarberById = (id) => {
  return BARBERS.find(b => b.id === id);
};

// Generar horarios según el intervalo del peluquero
export const getAllTimeSlots = (barber = null) => {
  const slots = [];
  
  // DETERMINAR INTERVALO SEGÚN PELUQUERO
  let interval;
  if (barber?.id === 'mili') {
    interval = 45; // Mili tiene intervalo de 45 minutos
    console.log(`⏰ Generando slots para Mili (${interval}min)`);
  } else if (barber?.id === 'santi') {
    interval = 30; // Santiago tiene intervalo de 30 minutos
    console.log(`⏰ Generando slots para Santiago (${interval}min)`);
  } else {
    interval = 30; // Por defecto 30 minutos
    console.log(`⏰ Generando slots por defecto (${interval}min)`);
  }
  
  // Horario de trabajo: 10:00 a 20:00
  const startHour = 10;
  const endHour = 20;
  
  let currentHour = startHour;
  let currentMinute = 0;
  
  console.log(`⏰ Iniciando generación de slots: ${startHour}:00 a ${endHour}:00`);
  
  while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
    const time = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    slots.push(time);
    
    // Avanzar el tiempo según el intervalo
    currentMinute += interval;
    
    // Ajustar horas si los minutos superan 60
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
    
    // Si hemos pasado las 20:00, terminar
    if (currentHour > endHour || (currentHour === endHour && currentMinute > 0)) {
      console.log(`   Fin: pasó de las ${endHour}:00`);
      break;
    }
  }
  
  console.log(`⏰ Total slots generados para ${barber?.id || 'default'}: ${slots.length}`);
  return slots;
};

// ========== FUNCIONES FIRESTORE PARA TURNOS ==========

// Obtener todos los turnos desde Firestore (CON FILTRO POR BARBER)
export const getAppointments = async (barberId = null) => {
  try {
    console.log('🔍 Obteniendo turnos de Firestore...', barberId ? `Filtro: barberId=${barberId}` : 'Sin filtro');
    const appointmentsRef = collection(db, 'appointments');
    
    // Crear query con filtro por barberId si se proporciona
    let q;
    if (barberId) {
      q = query(
        appointmentsRef, 
        where('barberId', '==', barberId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(appointmentsRef, orderBy('createdAt', 'desc'));
    }
    
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
    
    console.log(`✅ Total turnos obtenidos: ${appointments.length} ${barberId ? `para barberId=${barberId}` : ''}`);
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

// Obtener turnos por fecha desde Firestore (CON FILTRO POR BARBER)
export const getAppointmentsByDate = async (date, barberId = null) => {
  try {
    const searchDate = getLocalDateString(date);
    console.log(`🔍 Buscando turnos para fecha: ${searchDate}`, barberId ? `Filtro: barberId=${barberId}` : '');
    
    const appointmentsRef = collection(db, 'appointments');
    
    // Crear query con múltiples condiciones
    let q;
    if (barberId) {
      q = query(
        appointmentsRef, 
        where('date', '==', searchDate),
        where('barberId', '==', barberId)
      );
    } else {
      q = query(appointmentsRef, where('date', '==', searchDate));
    }
    
    const querySnapshot = await getDocs(q);
    
    const appointments = [];
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data(),
        date: searchDate // Ya está normalizado
      });
    });
    
    console.log(`✅ Turnos encontrados para ${searchDate}: ${appointments.length} ${barberId ? `para barberId=${barberId}` : ''}`);
    return appointments;
  } catch (error) {
    console.error('❌ Error obteniendo turnos por fecha:', error);
    return [];
  }
};

// Escuchar cambios en tiempo real de los turnos (CON FILTRO POR BARBER)
export const listenToAppointments = (callback, barberId = null) => {
  const appointmentsRef = collection(db, 'appointments');
  
  let q;
  if (barberId) {
    q = query(
      appointmentsRef, 
      where('barberId', '==', barberId),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(appointmentsRef, orderBy('createdAt', 'desc'));
  }
  
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

// Escuchar turnos por fecha en tiempo real (CON FILTRO POR BARBER)
export const listenToAppointmentsByDate = (date, callback, barberId = null) => {
  const searchDate = getLocalDateString(date);
  const appointmentsRef = collection(db, 'appointments');
  
  let q;
  if (barberId) {
    q = query(
      appointmentsRef, 
      where('date', '==', searchDate),
      where('barberId', '==', barberId)
    );
  } else {
    q = query(appointmentsRef, where('date', '==', searchDate));
  }
  
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

// Obtener horarios disponibles para una fecha (CON FILTRO POR BARBER)
export const getAvailableTimeSlots = async (selectedDate, barber = null, selectedServices = []) => {
  try {
    // Obtener intervalo específico del peluquero
    let interval;
    if (barber?.id === 'mili') {
      interval = 45; // Forzar 45 minutos para Mili
    } else if (barber?.id === 'santi') {
      interval = 30; // 30 minutos para Santiago
    } else {
      interval = barber?.interval || 30; // Por defecto 30
    }
    
    // Obtener slots base según el peluquero
    const baseSlots = getAllTimeSlots(barber);
    const searchDate = getLocalDateString(selectedDate);
    
    console.log(`📅 Obteniendo slots para ${searchDate} con ${barber?.name || 'default'}`);
    console.log(`⏰ Intervalo: ${interval}min`);
    
    // Obtener turnos existentes para esa fecha (FILTRADO POR BARBER)
    const existingAppointments = await getAppointmentsByDate(searchDate, barber?.id);
    console.log(`📊 Turnos existentes para ${barber?.name}:`, existingAppointments.length);
    
    // Si hay servicios seleccionados, calcular duración total
    const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
    console.log(`⏱️ Duración total de servicios: ${totalDuration}min`);
    
    // Filtrar slots ocupados
    const bookedTimes = [];
    existingAppointments.forEach(apt => {
      const aptTime = apt.time;
      const [aptHour, aptMinute] = aptTime.split(':').map(Number);
      const aptDuration = apt.duration || interval; // Usar el intervalo como duración por defecto
      
      console.log(`   Turno existente: ${aptTime} (${aptDuration}min) - Cliente: ${apt.clientName}`);
      
      // Marcar como ocupado el slot principal
      bookedTimes.push(aptTime);
      
      // Si la duración del turno es mayor que el intervalo, marcar slots adicionales como ocupados
      const slotsNeeded = Math.ceil(aptDuration / interval) - 1;
      
      for (let i = 1; i <= slotsNeeded; i++) {
        const totalMinutes = aptHour * 60 + aptMinute + (interval * i);
        const newHour = Math.floor(totalMinutes / 60);
        const newMinute = totalMinutes % 60;
        const newTime = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
        
        // Solo agregar si está dentro del horario de trabajo (10-20)
        if (newHour >= 10 && newHour <= 20 && !(newHour === 20 && newMinute > 0)) {
          bookedTimes.push(newTime);
        }
      }
    });
    
    // Filtrar horarios disponibles considerando duración de servicios
    const availableSlots = baseSlots.filter(slot => {
      // Verificar si el slot está ocupado
      if (bookedTimes.includes(slot)) {
        return false;
      }
      
      // Verificar si es un horario pasado
      if (isTimeInPast(searchDate, slot)) {
        return false;
      }
      
      // Si hay servicios seleccionados, verificar que haya suficiente tiempo consecutivo
      if (selectedServices.length > 0 && totalDuration > interval) {
        const slotsNeeded = Math.ceil(totalDuration / interval);
        const [startHour, startMinute] = slot.split(':').map(Number);
        
        // Verificar que todos los slots necesarios estén disponibles
        for (let i = 0; i < slotsNeeded; i++) {
          const totalMinutes = startHour * 60 + startMinute + (interval * i);
          const checkHour = Math.floor(totalMinutes / 60);
          const checkMinute = totalMinutes % 60;
          const checkTime = `${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}`;
          
          // Verificar límites de horario (10:00 - 20:00)
          if (checkHour < 10 || checkHour > 20 || (checkHour === 20 && checkMinute > 0)) {
            return false;
          }
          
          // Si el slot no está en baseSlots
          if (!baseSlots.includes(checkTime)) {
            return false;
          }
          
          // Si el slot está ocupado
          if (bookedTimes.includes(checkTime)) {
            return false;
          }
        }
      }
      
      return true;
    });
    
    console.log(`✅ Horarios disponibles para ${barber?.name || 'default'}:`, availableSlots.length);
    
    return availableSlots;
  } catch (error) {
    console.error('❌ Error obteniendo horarios disponibles:', error);
    return [];
  }
};

// Obtener estadísticas para el admin (CON FILTRO POR BARBER)
export const getAdminStats = async (barberId = null) => {
  try {
    const allAppointments = await getAppointments(barberId);
    const today = getTodayDateString();
    
    console.log(`📊 Hoy es: ${today}`, barberId ? `Filtro: barberId=${barberId}` : '');
    
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
      monthlyEarnings,
      barberId // Incluir en la respuesta para debugging
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return {
      totalAppointments: 0,
      todayAppointments: 0,
      totalEarnings: 0,
      monthlyEarnings: 0,
      barberId
    };
  }
};

// ========== FUNCIONES EXISTENTES ==========

// Buscar usuarios por username o documento (COMPARTIDOS ENTRE PELUQUEROS)
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

// Crear turno manual para admin (ASIGNA BARBERID AUTOMÁTICAMENTE)
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

const ADMIN_PHONE = '2233540664';

export const sendAdminWhatsAppNotification = (appointment) => {
  try {
    const barberInfo = appointment.barber ? `💇 *Peluquero:* ${appointment.barber.name}\n` : '';
    
    // Filtrar servicios
    const paidServices = appointment.services.filter(s => s.price > 0);
    const consultServices = appointment.services.filter(s => s.price === 0);
    
    let servicesList = '';
    if (paidServices.length > 0) {
      servicesList += paidServices.map(s => `• ${s.name} - $${s.price}`).join('\n');
    }
    if (consultServices.length > 0) {
      if (servicesList) servicesList += '\n';
      servicesList += consultServices.map(s => `• ${s.name} - (Consultar precio)`).join('\n');
    }
    
    // Información de señal
    const depositInfo = appointment.depositAmount > 0 ? 
      `\n💰 *SEÑA REQUERIDA:* $${appointment.depositAmount} (50%)
   📋 *Estado:* ${appointment.depositStatus === 'pending' ? '❌ PENDIENTE' : '✅ PAGADA'}
   💳 *Método:* ${appointment.depositPaymentMethod || 'Transferencia'}` : 
      '\n💰 *SEÑA:* No requiere (servicios a consultar)';
    
    const message = `📅 *NUEVO TURNO SOLICITADO* 📅

👤 *Cliente:* ${appointment.clientName}
📞 *Teléfono:* ${appointment.phone}
${barberInfo}📅 *Fecha:* ${formatDateForDisplay(appointment.date)} a las ${appointment.time}
⏰ *Hora:* ${appointment.time}

💇 *Servicios:*
${servicesList}

💰 *Total:* $${appointment.total}
${depositInfo}

💳 *Método de pago final:* ${appointment.paymentMethod}

📝 *Notas:* ${appointment.notes || 'Ninguna'}

🆔 *ID de turno:* ${appointment.confirmationNumber}

⚠️ *El turno se confirmará cuando se reciba la seña*`;

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
  const { clientName, date, time, confirmationNumber, barber } = appointment;
  const barberInfo = barber ? `💇 *Con:* ${barber.name}\n` : '';
  
  const confirmationMessage = `✅ *Turno Confirmado - Ian Castillo BarberShop* ✅

Hola ${clientName}! Tu turno ha sido confirmado:

📅 *Fecha:* ${formatDateForDisplay(date)} a las ${time}
${barberInfo}🆔 *N° de confirmación:* ${confirmationNumber}

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
    
    // Calcular señal (50% del total, solo de servicios con precio)
    const totalWithPrice = appointmentData.services
      .filter(service => service.price > 0)
      .reduce((sum, service) => sum + service.price, 0);
    
    const depositAmount = Math.round(totalWithPrice * 0.5);
    
    const formattedAppointmentData = {
      ...appointmentData,
      date: getLocalDateString(appointmentData.date),
      confirmationNumber: 'CONF-' + Date.now().toString().slice(-6),
      // Campos para la señal
      depositAmount: depositAmount,
      depositStatus: 'pending', // pending, paid, completed, cancelled
      depositRequired: depositAmount > 0,
      depositPaymentMethod: 'transferencia',
      depositPaidAt: null,
      totalWithDeposit: appointmentData.total // El total ya incluye todo
    };
    
    console.log('💰 Señal calculada:', depositAmount);
    console.log('📅 Fecha normalizada:', formattedAppointmentData.date);
    
    // Crear el turno en Firestore
    const newAppointment = await createAppointment(formattedAppointmentData);
    
    console.log('✅ Turno creado en Firestore:', newAppointment);
    
    // Enviar WhatsApp al ADMIN con info de señal
    setTimeout(() => {
      const sent = sendAdminWhatsAppNotification(newAppointment);
      if (sent) {
        console.log('✅ WhatsApp enviado al admin exitosamente');
      } else {
        console.log('❌ Error enviando WhatsApp al admin');
      }
    }, 1000);
    
    // Programar recordatorio
    const reminder = scheduleClientReminder(newAppointment);
    
    // Enviar confirmación con info de señal
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


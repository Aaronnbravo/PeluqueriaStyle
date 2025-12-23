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
    name: 'Santuu',
    image: '/images/Barbers/Santuu.jpg',
    interval: 30,
    description: 'Corte clásico y moderno'
  },
  {
    id: 'mili',
    name: 'Mili',
    image: '/images/Barbers/Mili.JPG',
    interval: 45,
    description: 'Coloración y estilismo'
  }
];

// Información de transferencia bancaria
export const BANK_TRANSFER_INFO = {
  alias: 'PISO.STYLE',
  accountHolder: 'santiago martin tejada',
  bank: 'naranja digital',
  amountPercentage: 50
};

// ========== FUNCIONES AUXILIARES DE FECHA ==========

// Función para convertir cualquier fecha a YYYY-MM-DD sin problemas de zona horaria
export const getLocalDateString = (dateInput) => {
  if (!dateInput) return '';
  
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split('/');
    const result = `${year}-${month}-${day}`;
    return result;
  }
  
  let date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }
  
  if (isNaN(date.getTime())) {
    console.error('❌ Fecha inválida en getLocalDateString:', dateInput);
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const result = `${year}-${month}-${day}`;
  return result;
};

// Función para convertir de YYYY-MM-DD a DD/MM/YYYY (para mostrar)
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  
  if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }
  
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
  
  if (dateString < today) return true;
  
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
  
  let interval;
  if (barber?.id === 'mili') {
    interval = 45;
  } else if (barber?.id === 'santi') {
    interval = 30;
  } else {
    interval = 30;
  }
  
  const startHour = 10;
  const endHour = 20;
  
  let currentHour = startHour;
  let currentMinute = 0;
  
  while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
    const time = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    slots.push(time);
    
    currentMinute += interval;
    
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
    
    if (currentHour > endHour || (currentHour === endHour && currentMinute > 0)) {
      break;
    }
  }
  
  return slots;
};

// ========== FUNCIONES FIRESTORE PARA TURNOS ==========

// Obtener todos los turnos desde Firestore
export const getAppointments = async (barberId = null) => {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const querySnapshot = await getDocs(appointmentsRef);
    
    const allAppointments = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const normalizedDate = getLocalDateString(data.date);
      
      allAppointments.push({
        id: doc.id,
        ...data,
        date: normalizedDate,
        dateDisplay: formatDateForDisplay(normalizedDate),
        total: Number(data.total) || 0,
        duration: Number(data.duration) || 0
      });
    });
    
    let filteredAppointments = allAppointments;
    if (barberId) {
      filteredAppointments = allAppointments.filter(apt => apt.barberId === barberId);
    }
    
    filteredAppointments.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    return filteredAppointments;
  } catch (error) {
    console.error('❌ Error en getAppointments:', error);
    
    try {
      const appointmentsRef = collection(db, 'appointments');
      const snapshot = await getDocs(appointmentsRef);
      
      const appointments = [];
      snapshot.forEach(doc => {
        appointments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      if (barberId) {
        return appointments.filter(apt => apt.barberId === barberId);
      }
      
      return appointments;
    } catch (fallbackError) {
      console.error('❌ Fallback también falló:', fallbackError);
      return [];
    }
  }
};

// Crear nuevo turno en Firestore
export const createAppointment = async (appointmentData) => {
  try {
    const formattedDate = getLocalDateString(appointmentData.date);
    
    const appointmentToSave = {
      ...appointmentData,
      date: formattedDate,
      status: appointmentData.status || 'pending', // Cambiado a 'pending' por defecto
      createdAt: new Date().toISOString(),
      timestamp: Timestamp.now()
    };
    
    const appointmentsRef = collection(db, 'appointments');
    const docRef = await addDoc(appointmentsRef, appointmentToSave);
    
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
export const getAppointmentsByDate = async (date, barberId = null) => {
  try {
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
    
    const querySnapshot = await getDocs(q);
    
    const appointments = [];
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data(),
        date: searchDate
      });
    });
    
    return appointments;
  } catch (error) {
    console.error('❌ Error obteniendo turnos por fecha:', error);
    return [];
  }
};

// Escuchar cambios en tiempo real de los turnos
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

// Escuchar turnos por fecha en tiempo real
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

// Cancelar turno
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

// Obtener horarios disponibles para una fecha
export const getAvailableTimeSlots = async (selectedDate, barber = null, selectedServices = []) => {
  try {
    let interval;
    if (barber?.id === 'mili') {
      interval = 45;
    } else if (barber?.id === 'santi') {
      interval = 30;
    } else {
      interval = barber?.interval || 30;
    }
    
    const baseSlots = getAllTimeSlots(barber);
    const searchDate = getLocalDateString(selectedDate);
    
    const existingAppointments = await getAppointmentsByDate(searchDate, barber?.id);
    const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
    
    const bookedTimes = [];
    existingAppointments.forEach(apt => {
      const aptTime = apt.time;
      const [aptHour, aptMinute] = aptTime.split(':').map(Number);
      const aptDuration = apt.duration || interval;
      
      bookedTimes.push(aptTime);
      
      const slotsNeeded = Math.ceil(aptDuration / interval) - 1;
      
      for (let i = 1; i <= slotsNeeded; i++) {
        const totalMinutes = aptHour * 60 + aptMinute + (interval * i);
        const newHour = Math.floor(totalMinutes / 60);
        const newMinute = totalMinutes % 60;
        const newTime = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
        
        if (newHour >= 10 && newHour <= 20 && !(newHour === 20 && newMinute > 0)) {
          bookedTimes.push(newTime);
        }
      }
    });
    
    const availableSlots = baseSlots.filter(slot => {
      if (bookedTimes.includes(slot)) {
        return false;
      }
      
      if (isTimeInPast(searchDate, slot)) {
        return false;
      }
      
      if (selectedServices.length > 0 && totalDuration > interval) {
        const slotsNeeded = Math.ceil(totalDuration / interval);
        const [startHour, startMinute] = slot.split(':').map(Number);
        
        for (let i = 0; i < slotsNeeded; i++) {
          const totalMinutes = startHour * 60 + startMinute + (interval * i);
          const checkHour = Math.floor(totalMinutes / 60);
          const checkMinute = totalMinutes % 60;
          const checkTime = `${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}`;
          
          if (checkHour < 10 || checkHour > 20 || (checkHour === 20 && checkMinute > 0)) {
            return false;
          }
          
          if (!baseSlots.includes(checkTime)) {
            return false;
          }
          
          if (bookedTimes.includes(checkTime)) {
            return false;
          }
        }
      }
      
      return true;
    });
    
    return availableSlots;
  } catch (error) {
    console.error('❌ Error obteniendo horarios disponibles:', error);
    return [];
  }
};

// Obtener estadísticas para el admin
export const getAdminStats = async (barberId = null) => {
  try {
    const allAppointments = await getAppointments(barberId);
    
    const today = getTodayDateString();
    const todayAppointments = allAppointments.filter(apt => apt.date === today);
    
    const earnedAppointments = allAppointments.filter(apt => {
      const isValidStatus = apt.status === 'confirmed' || apt.status === 'completed';
      const hasTotal = Number(apt.total) > 0;
      return isValidStatus && hasTotal;
    });
    
    const totalEarnings = earnedAppointments.reduce((sum, apt) => {
      return sum + (Number(apt.total) || 0);
    }, 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyEarnings = earnedAppointments
      .filter(apt => {
        if (!apt.date) return false;
        const aptDate = new Date(apt.date);
        return aptDate.getMonth() === currentMonth && 
               aptDate.getFullYear() === currentYear;
      })
      .reduce((sum, apt) => sum + (Number(apt.total) || 0), 0);

    return {
      totalAppointments: allAppointments.length,
      todayAppointments: todayAppointments.length,
      totalEarnings,
      monthlyEarnings,
      barberId
    };
  } catch (error) {
    console.error('❌ Error en getAdminStats:', error);
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
    
    const safePhone = appointmentData.phone || 'Sin teléfono';
    const safePaymentMethod = appointmentData.paymentMethod || 'Transferencia Bancaria';
    
    const appointmentToSave = {
      clientName: appointmentData.clientName || '',
      phone: safePhone,
      email: appointmentData.email || '',
      
      date: formattedDate,
      time: appointmentData.time || '',
      services: appointmentData.services || [],
      total: appointmentData.total || 0,
      duration: appointmentData.duration || 0,
      paymentMethod: safePaymentMethod,
      notes: appointmentData.notes || '',
      userId: appointmentData.userId || '',
      
      barberId: appointmentData.barberId || '',
      barberName: appointmentData.barberName || 'Sin asignar',
      
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      timestamp: Timestamp.now(),
      updatedAt: new Date().toISOString()
    };
    
    const appointmentsRef = collection(db, 'appointments');
    const docRef = await addDoc(appointmentsRef, appointmentToSave);
    
    return {
      id: docRef.id,
      ...appointmentToSave
    };
  } catch (error) {
    console.error('❌ Error FATAL creando turno admin:', error);
    throw error;
  }
};

// ========== SERVICIO DE NOTIFICACIONES ==========

const ADMIN_PHONE = '2233540664';

// Función para generar enlaces de recordatorio de calendario
export const generateCalendarLinks = (appointment) => {
  const { clientName, date, time, services, barber } = appointment;
  
  // Convertir fecha DD/MM/YYYY a Date object
  const [day, month, year] = date.split('/').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  
  // Crear fecha del turno
  const appointmentDate = new Date(year, month - 1, day, hours, minutes);
  
  // Crear fecha del recordatorio (2 horas antes)
  const reminderDate = new Date(appointmentDate);
  reminderDate.setHours(reminderDate.getHours() - 2);
  
  // Formatear fechas para URLs
  const formatForGoogle = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const startTimeGoogle = formatForGoogle(appointmentDate);
  const endTimeGoogle = formatForGoogle(new Date(appointmentDate.getTime() + (appointment.duration || 30) * 60000));
  
  // Crear descripción
  const serviceNames = services.map(s => s.name).join(', ');
  const description = `Turno confirmado en Piso Style BarberShop%0A%0A` +
    `Cliente: ${clientName}%0A` +
    `Peluquero: ${barber?.name || 'No asignado'}%0A` +
    `Servicios: ${serviceNames}%0A` +
    `Duración: ${appointment.duration} minutos%0A` +
    `Total: $${appointment.total}%0A%0A` +
    `Recordá presentarte 10 minutos antes.`;
  
  // URL para Google Calendar
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=Turno en Piso Style BarberShop` +
    `&dates=${startTimeGoogle}/${endTimeGoogle}` +
    `&details=${description}` +
    `&location=Jujuy 1442, Mar del Plata` +
    `&trp=false&sprop=&sprop=name:`;
  
  // URL para Apple Calendar (ics file)
  const createIcsContent = () => {
    const formatDateForICS = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0];
    };
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDateForICS(appointmentDate)}`,
      `DTEND:${formatDateForICS(new Date(appointmentDate.getTime() + (appointment.duration || 30) * 60000))}`,
      `SUMMARY:Turno en Piso Style BarberShop`,
      `DESCRIPTION:${description.replace(/%0A/g, '\\n')}`,
      `LOCATION:Jujuy 1442, Mar del Plata`,
      'BEGIN:VALARM',
      `TRIGGER:-PT2H`,
      'ACTION:DISPLAY',
      'DESCRIPTION:Recordatorio de turno',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');
    
    return encodeURIComponent(icsContent);
  };
  
  const appleCalendarUrl = `data:text/calendar;charset=utf8,${createIcsContent()}`;
  
  return {
    google: googleCalendarUrl,
    apple: appleCalendarUrl,
    description: `Recordatorio 2 horas antes del turno con ${barber?.name || 'el peluquero'}`
  };
};

export const sendAdminWhatsAppNotification = (appointment) => {
  try {
    const barberInfo = appointment.barber ? `💇 *Peluquero:* ${appointment.barber.name}\n` : '';
    
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
    
    const depositAmount = Math.round(paidServices.reduce((sum, s) => sum + s.price, 0) * 0.5);
    
    const depositInfo = depositAmount > 0 ? 
      `\n💰 *SEÑA REQUERIDA:* $${depositAmount} (50%)
   📋 *Estado:* ❌ PENDIENTE DE PAGO
   💳 *Método:* Transferencia Bancaria
   📝 *Datos para transferencia:*
      • Alias: PISO.STYLE
      • Titular: santiago martin tejada
      • Entidad: naranja digital
      
   📱 *Enviar comprobante por WhatsApp al:* ${ADMIN_PHONE}` : 
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
📊 *Estado:* ⏳ PENDIENTE DE CONFIRMACIÓN

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
  
  const [year, month, day] = date.split('-').map(Number);
  const appointmentDateTime = new Date(year, month - 1, day);
  
  const [hours, minutes] = time.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  
  const reminderDateTime = new Date(appointmentDateTime.getTime() - (2 * 60 * 60 * 1000));
  
  const reminderMessage = `⏰ *Recordatorio - Piso Style BarberShop* ⏰

Hola ${clientName}! Te recordamos que tenés un turno:

📅 *Cuándo:* ${formatDateForDisplay(date)} a las ${time}
📍 *Dónde:* Jujuy 1442, Mar del Plata

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

export const sendImmediateConfirmation = (appointment, includeTransferInfo = true) => {
  const { clientName, date, time, confirmationNumber, barber, services, total } = appointment;
  const barberInfo = barber ? `💇 *Con:* ${barber.name}\n` : '';
  
  // Calcular señal (50% de servicios con precio)
  const paidServices = services.filter(s => s.price > 0);
  const depositAmount = Math.round(paidServices.reduce((sum, s) => sum + s.price, 0) * 0.5);
  
  let transferInfo = '';
  if (includeTransferInfo && depositAmount > 0) {
    transferInfo = `
    
💰 *SEÑA REQUERIDA (50%):* $${depositAmount}

📝 *Para confirmar tu turno, realiza la transferencia a:*
   • *Alias:* PISO.STYLE
   • *Titular:* santiago martin tejada
   • *Entidad:* naranja digital

📱 *Envía el comprobante por WhatsApp al:* ${ADMIN_PHONE}

⏳ *Tu turno está en estado PENDIENTE hasta que se confirme el pago.*`;
  }
  
  const serviceNames = services.map(s => s.name).join(', ');
  
  const confirmationMessage = `✅ *Turno Agendado - Piso Style BarberShop* ✅

Hola ${clientName}! Tu turno ha sido agendado:

📅 *Fecha:* ${formatDateForDisplay(date)} a las ${time}
${barberInfo}🆔 *N° de confirmación:* ${confirmationNumber}
💇 *Servicios:* ${serviceNames}
💰 *Total:* $${total}
📊 *Estado:* ⏳ PENDIENTE DE CONFIRMACIÓN${transferInfo}

📍 *Dirección:* Jujuy 1442, Mar del Plata

💡 *Recordá:*
• Presentate 10 minutos antes
• Cancelación con 12h de anticipación
• Traé puntualidad para mejor atención

¡Te esperamos! ✂️`;

  console.log('✅ Confirmación lista para enviar al cliente');
  
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(confirmationMessage)}`;
  
  return {
    message: confirmationMessage,
    whatsappUrl: whatsappUrl,
    depositAmount: depositAmount
  };
};

// Función mejorada para crear turno con notificaciones
export const createAppointmentWithNotifications = async (appointmentData) => {
  try {
    console.log('📝 Creando turno con datos:', appointmentData);
    
    // Calcular señal (50% del total, solo de servicios con precio)
    const paidServices = appointmentData.services.filter(service => service.price > 0);
    const depositAmount = Math.round(paidServices.reduce((sum, service) => sum + service.price, 0) * 0.5);
    
    const formattedAppointmentData = {
      ...appointmentData,
      date: getLocalDateString(appointmentData.date),
      confirmationNumber: 'CONF-' + Date.now().toString().slice(-6),
      // Campos para la señal
      depositAmount: depositAmount,
      depositStatus: 'pending',
      depositRequired: depositAmount > 0,
      depositPaymentMethod: 'transferencia',
      depositPaidAt: null,
      totalWithDeposit: appointmentData.total,
      // Estado inicial: pending (no confirmed)
      status: 'pending'
    };
    
    console.log('💰 Señal calculada:', depositAmount);
    console.log('📅 Fecha normalizada:', formattedAppointmentData.date);
    console.log('📊 Estado inicial del turno:', formattedAppointmentData.status);
    
    // Crear el turno en Firestore con estado pending
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
    
    // Enviar confirmación CON INFO DE TRANSFERENCIA al cliente
    const confirmation = sendImmediateConfirmation(newAppointment, true);
    
    // Generar enlaces de calendario
    const calendarLinks = generateCalendarLinks(newAppointment);
    
    return {
      ...newAppointment,
      notifications: {
        adminNotified: true,
        clientReminder: reminder,
        clientConfirmation: confirmation,
        calendarLinks: calendarLinks
      },
      depositAmount: depositAmount
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
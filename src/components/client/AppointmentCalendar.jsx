import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert, Row, Col } from 'react-bootstrap';
import { getAvailableTimeSlots, getAppointmentsByDate, getAllTimeSlots, listenToAppointmentsByDate, getBarbers } from '../../services/appointments';

// Función helper para obtener fecha en formato YYYY-MM-DD local
// Función para obtener fecha en formato DD/MM/YYYY para el cliente
const getClientDateString = (date) => {
  if (!date) return '';
  
  console.log('📅 getClientDateString input:', date, 'tipo:', typeof date);
  
  // Si ya está en formato DD/MM/YYYY, devolverlo
  if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    return date;
  }
  
  // Si está en formato YYYY-MM-DD, convertir a DD/MM/YYYY
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-');
    const result = `${day}/${month}/${year}`;
    console.log('🔄 YYYY-MM-DD -> DD/MM/YYYY:', date, '->', result);
    return result;
  }
  
  // Si es Date object
  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    // Intentar crear Date
    dateObj = new Date(date);
  }
  
  // Verificar que sea válido
  if (isNaN(dateObj.getTime())) {
    console.error('❌ Fecha inválida:', date);
    return '';
  }
  
  // Usar componentes LOCALES (no UTC)
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  const result = `${day}/${month}/${year}`;
  console.log('📅 Date -> DD/MM/YYYY:', date, '->', result);
  return result;
};

export function AppointmentCalendar({ 
  onDateTimeSelect, 
  selectedDate, 
  selectedTime, 
  onDateSelected, 
  onTimeSelected, 
  confirmationAlertRef,
  selectedBarber: propSelectedBarber,
  onBarberSelect: propOnBarberSelect 
}) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weekDays, setWeekDays] = useState([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [dayStatus, setDayStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState(propSelectedBarber || null);
  const timeSlotsRef = useRef(null);
  const calendarRef = useRef(null);
  const barbers = getBarbers();

 
  // Función para verificar si un horario ya pasó - VERSIÓN CORREGIDA para DD/MM/YYYY
const isTimeInPast = (dateString, time) => {
  if (!dateString || !time) return false;
  
  const now = new Date();
  
  // Parsear fecha DD/MM/YYYY
  if (typeof dateString === 'string' && dateString.includes('/')) {
    const [day, month, year] = dateString.split('/').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    // Crear fecha local
    const slotDateTime = new Date(year, month - 1, day, hours, minutes, 0);
    return slotDateTime < now;
  }
  
  // Si está en YYYY-MM-DD
  if (typeof dateString === 'string' && dateString.includes('-')) {
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    const slotDateTime = new Date(year, month - 1, day, hours, minutes, 0);
    return slotDateTime < now;
  }
  
  return false;
};

  // Función para obtener fecha local desde string YYYY-MM-DD
  const getDateFromDDMMYYYY = (dateString) => {
  if (!dateString) return null;
  
  // Si está en DD/MM/YYYY
  if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Si está en YYYY-MM-DD
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  return null;
};

  // Generar semana (Lunes a Sábado)
  const generateWeekDays = (startDate) => {
    const days = [];
    const date = new Date(startDate);

    // Ir al lunes de esta semana
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    date.setDate(diff);

    // Generar Lunes a Sábado (6 días)
    for (let i = 0; i < 6; i++) {
      const dayDate = new Date(date);
      dayDate.setDate(date.getDate() + i);
      days.push(dayDate);
    }

    return days;
  };

  // Verificar estado del día (disponible/ocupado) - VERSIÓN ASÍNCRONA
  const checkDayStatus = async (date) => {
    const dateString = getClientDateString(date);
    try {
      const appointments = await getAppointmentsByDate(dateString);
      const timeSlots = await getAvailableTimeSlots(dateString, selectedBarber);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDay = new Date(date);
      selectedDay.setHours(0, 0, 0, 0);

      return {
        date: dateString,
        isAvailable: timeSlots.length > 0,
        isPast: selectedDay < today,
        appointmentCount: appointments.length,
        availableSlots: timeSlots.length
      };
    } catch (error) {
      console.error('Error checkDayStatus:', error);
      return {
        date: dateString,
        isAvailable: false,
        isPast: false,
        appointmentCount: 0,
        availableSlots: 0
      };
    }
  };

  // Navegación entre semanas
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  // Cargar días de la semana y sus estados - VERSIÓN ASÍNCRONA
  useEffect(() => {
    const loadWeekDays = async () => {
      setLoading(true);
      const days = generateWeekDays(currentWeek);
      setWeekDays(days);

      const status = {};
      for (const day of days) {
        const statusInfo = await checkDayStatus(day);
        const dateKey = getClientDateString(day);
        status[dateKey] = statusInfo;
      }
      setDayStatus(status);
      setLoading(false);
    };

    loadWeekDays();
  }, [currentWeek, selectedBarber]);

  // Cargar horarios cuando se selecciona una fecha - VERSIÓN ASÍNCRONA
  const loadTimeSlots = async (date, barber = selectedBarber) => {
    if (date) {
      setLoading(true);
      try {
        const slots = await getAvailableTimeSlots(date, barber);
        setAvailableTimeSlots(slots);
        
        // También actualizar el estado del día
        const dayDate = getDateFromDDMMYYYY(date);
        if (dayDate) {
          const dateKey = getClientDateString(dayDate);
          const statusInfo = await checkDayStatus(dayDate);
          setDayStatus(prev => ({
            ...prev,
            [dateKey]: statusInfo
          }));
        }
      } catch (error) {
        console.error('Error cargando horarios:', error);
        setAvailableTimeSlots([]);
      } finally {
        setLoading(false);
      }
    } else {
      setAvailableTimeSlots([]);
    }
  };

  useEffect(() => {
    loadTimeSlots(selectedDate, selectedBarber);
  }, [selectedDate, selectedBarber]);

  // Actualizar estado de días cada minuto para horarios pasados - VERSIÓN ASÍNCRONA
  useEffect(() => {
    const updateSlots = async () => {
      if (selectedDate) {
        try {
          const slots = await getAvailableTimeSlots(selectedDate, selectedBarber);
          setAvailableTimeSlots(slots);
        } catch (error) {
          console.error('Error actualizando horarios:', error);
        }
      }
    };

    const interval = setInterval(updateSlots, 60000); // Cada minuto

    return () => clearInterval(interval);
  }, [selectedDate, selectedBarber]);

  // Escuchar cambios en tiempo real para la fecha seleccionada
  useEffect(() => {
    if (selectedDate) {
      console.log('🔍 Escuchando cambios en tiempo real para:', selectedDate);
      
      const unsubscribe = listenToAppointmentsByDate(selectedDate, async (appointments) => {
        console.log('📡 Turnos actualizados en tiempo real:', appointments.length);
        
        // Cuando hay cambios, actualizar los horarios
        try {
          const slots = await getAvailableTimeSlots(selectedDate, selectedBarber);
          setAvailableTimeSlots(slots);
          
          // También actualizar estado del día
          const dayDate = getDateFromDDMMYYYY(selectedDate);
          if (dayDate) {
            const statusInfo = await checkDayStatus(dayDate);
            const dateKey = getClientDateString(dayDate);
            setDayStatus(prev => ({
              ...prev,
              [dateKey]: statusInfo
            }));
          }
        } catch (error) {
          console.error('Error actualizando con cambios en tiempo real:', error);
        }
      });
      
      // Limpiar suscripción cuando cambia la fecha o se desmonta
      return () => {
        console.log('🧹 Limpiando suscripción para:', selectedDate);
        unsubscribe();
      };
    }
  }, [selectedDate, selectedBarber]);

  // Nueva función para manejar selección de peluquero
  const handleBarberSelect = (barber) => {
    setSelectedBarber(barber);
    if (propOnBarberSelect) {
      propOnBarberSelect(barber);
    }
    
    // Resetear fecha y hora si cambia el peluquero
    onDateTimeSelect('', '');
    
    // Si ya hay una fecha seleccionada, actualizar los horarios disponibles
    if (selectedDate) {
      loadTimeSlots(selectedDate, barber);
    }
  };

  const handleDateSelect = (date) => {
    const dateString = getClientDateString(date);
    const status = dayStatus[dateString];

    if (status && !status.isPast && status.isAvailable) {
      onDateTimeSelect(dateString, '');
      
      // Scroll a horarios después de seleccionar fecha
      setTimeout(() => {
        timeSlotsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 300);

      if (onDateSelected) {
        onDateSelected();
      }
    }
  };

  const handleTimeSelect = (time) => {
    onDateTimeSelect(selectedDate, time);
    
    // Scroll a servicios después de seleccionar hora
    setTimeout(() => {
      if (onTimeSelected) {
        onTimeSelected();
      }
    }, 300);
  };

  // Formatear fecha para mostrar
  const formatDay = (date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'short' });
  };

  const formatDate = (date) => {
    return date.getDate();
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString('es-ES', { month: 'short' });
  };

  const getDayVariant = (date) => {
    const dateString = getClientDateString(date);
    const status = dayStatus[dateString];

    if (!status) return 'outline-secondary';

    if (status.isPast) return 'outline-secondary';
    if (!status.isAvailable) return 'danger';
    if (selectedDate === dateString) return 'primary';
    return 'outline-primary';
  };

  // Obtener fecha local para mostrar en título
  const getDisplayDate = () => {
    if (!selectedDate) return '';
    const date = getDateFromDDMMYYYY(selectedDate);
    if (!date) return selectedDate;
    
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Usar la función importada para obtener todos los horarios según el peluquero
  const allTimeSlots = getAllTimeSlots(selectedBarber);

  return (
    <Card className="appointment-calendar-card" ref={calendarRef}>
      <Card.Header className="calendar-header">
        <h5><i className="fa-solid fa-calendar-days"></i> Seleccionar Peluquero, Fecha y Hora</h5>
        <div className="week-navigation">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={goToPreviousWeek}
            className="nav-btn"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </Button>
          <span className="week-display">
            {weekDays[0] && weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} -
            {weekDays[5] && weekDays[5].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
          </span>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={goToNextWeek}
            className="nav-btn"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </Button>
        </div>
      </Card.Header>

      <Card.Body>
        {/* SELECTOR DE PELUQUERO */}
        <div className="mb-4">
          <h6 className="mb-3">
            <i className="fa-solid fa-user-check me-2"></i>
            Primero, elige con quién cortarte:
          </h6>
          <Row className="g-2">
            {barbers.map(barber => (
              <Col key={barber.id} xs={6} className="mb-3">
                <div 
                  className={`barber-option ${selectedBarber?.id === barber.id ? 'selected' : ''}`}
                  onClick={() => handleBarberSelect(barber)}
                >
                  <div className="barber-option-image">
                    <img 
                      src={barber.image} 
                      alt={barber.name}
                      onError={(e) => {
                        e.target.src = 'src/images/Logo.png';
                      }}
                    />
                  </div>
                  <div className="barber-option-info">
                    <h6 className="mb-1">{barber.name}</h6>
                    <small className="text-muted">
                      <i className="fa-solid fa-clock me-1"></i>
                      Turnos cada {barber.interval} min
                    </small>
                  </div>
                  {selectedBarber?.id === barber.id && (
                    <div className="barber-option-check">
                      <i className="fa-solid fa-check-circle"></i>
                    </div>
                  )}
                </div>
              </Col>
            ))}
          </Row>
        </div>

        {!selectedBarber && (
          <Alert variant="warning" className="mb-4">
            <i className="fa-solid fa-user-slash me-2"></i>
            Por favor selecciona un peluquero para ver disponibilidad
          </Alert>
        )}

        {loading && (
          <div className="text-center mb-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-2 text-muted">Cargando disponibilidad...</p>
          </div>
        )}

        {/* Calendario Semanal - Mostrar solo si hay peluquero seleccionado */}
        {selectedBarber && (
          <>
            <div className="week-calendar mb-4">
              <Row className="g-2">
                {weekDays.map((day) => {
                  const dateString = getClientDateString(day);
                  const status = dayStatus[dateString];
                  const variant = getDayVariant(day);
                  const isSelected = selectedDate === dateString;

                  return (
                    <Col key={dateString} xs={4} sm={4} md={2} className="mb-2">
                      <Button
                        variant={variant}
                        className={`day-button w-100 ${isSelected ? 'selected' : ''} ${status?.isPast ? 'past-day' : ''
                          }`}
                        onClick={() => handleDateSelect(day)}
                        disabled={status?.isPast || !status?.isAvailable || loading}
                      >
                        <div className="day-content">
                          <div className="day-name">{formatDay(day)}</div>
                          <div className="day-number">{formatDate(day)}</div>
                          <div className="day-month">{formatMonth(day)}</div>
                          {status && !status.isPast && (
                            <div className="day-status">
                              {status.isAvailable ? (
                                <small className="text-success">
                                  <i className="fa-solid fa-check me-1"></i>
                                  {status.availableSlots} disp.
                                </small>
                              ) : (
                                <small className="text-danger">
                                  <i className="fa-solid fa-xmark me-1"></i>
                                  Completo
                                </small>
                              )}
                            </div>
                          )}
                        </div>
                      </Button>
                    </Col>
                  );
                })}
              </Row>
            </div>

            {/* Horarios */}
            {selectedDate && (
              <div className="time-selection" ref={timeSlotsRef}>
                <h6>
                  <i className="fa-solid fa-clock me-2"></i>
                  Horarios disponibles con {selectedBarber.name} para {getDisplayDate()}:
                </h6>
                
                {loading ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Cargando horarios...</span>
                    </div>
                    <p className="mt-2 text-muted small">Cargando horarios disponibles...</p>
                  </div>
                ) : availableTimeSlots.length > 0 ? (
                  <Row className="g-2">
                    {allTimeSlots.map(time => {
                      const isAvailable = availableTimeSlots.includes(time);
                      const isSelected = selectedTime === time;
                      const isPast = isTimeInPast(selectedDate, time);

                      return (
                        <Col key={time} xs={6} sm={4} className="mb-2">
                          <Button
                            variant={
                              isPast ? "outline-secondary" : 
                              isSelected ? "primary" : 
                              isAvailable ? "outline-primary" : "outline-danger"
                            }
                            className={`time-slot w-100 ${isPast ? 'past-time' : ''} ${!isAvailable ? 'occupied' : ''}`}
                            onClick={() => !isPast && isAvailable && handleTimeSelect(time)}
                            disabled={isPast || !isAvailable || loading}
                          >
                            {time}
                            {isPast && <small className="d-block">Pasado</small>}
                            {!isAvailable && !isPast && <small className="d-block">Ocupado</small>}
                          </Button>
                        </Col>
                      );
                    })}
                  </Row>
                ) : (
                  <Alert variant="warning">
                    <i className="fa-solid fa-triangle-exclamation me-2"></i>
                    No hay horarios disponibles para esta fecha con {selectedBarber.name}. Por favor selecciona otra fecha.
                  </Alert>
                )}
              </div>
            )}

            {selectedDate && selectedTime && (
              <Alert variant="success" className="mt-3" ref={confirmationAlertRef}>
                <strong>
                  <i className="fa-solid fa-check me-2"></i>
                  Turno seleccionado:<br />
                  <i className="fa-solid fa-user me-2"></i>
                  Peluquero: {selectedBarber.name}<br />
                  <i className="fa-solid fa-calendar-day me-2"></i>
                  Día: {getDisplayDate()}<br />
                  <i className="fa-solid fa-clock me-2"></i>
                  Horario: {selectedTime}
                </strong>
              </Alert>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}

export default AppointmentCalendar;
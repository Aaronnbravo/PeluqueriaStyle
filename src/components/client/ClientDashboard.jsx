import React, { useState, useRef, useEffect } from 'react'
import { Container, Row, Col, Alert, Button, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import AppointmentCalendar from './AppointmentCalendar'
import AppointmentForm from './AppointmentForm'
import { useAuth } from '../../hooks/useAuth'
import { getAppointments, cancelAppointment, generateCalendarLinks } from '../../services/appointments'
import './ClientDashboard.css'

function ClientDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [existingAppointment, setExistingAppointment] = useState(null)
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const servicesRef = useRef(null)
  const confirmationAlertRef = useRef(null)

  // useEffect corregido para buscar turnos existentes
  useEffect(() => {
    if (!user || authLoading) return;

    const checkExistingAppointment = async () => {
      setLoadingAppointments(true);
      try {
        const appointments = await getAppointments();
        const userName = user.username || user.firstName || user.name || user.email;
        
        // DEBUG: Ver todos los turnos del usuario
        console.log('🔍 Buscando turnos para usuario:', userName);
        console.log('📊 Todos los turnos en Firestore:', appointments.length);
        
        // Buscar turnos del usuario en CUALQUIER estado (no solo 'confirmed')
        const userAppointments = appointments.filter(apt => {
          const appointmentName = apt.clientName || '';
          const userEmail = user.email || '';
          const aptEmail = apt.email || '';
          
          // Verificar coincidencia por nombre o email
          const nameMatch = appointmentName.includes(userName) || 
                           userName.includes(appointmentName);
          const emailMatch = aptEmail && userEmail && 
                            aptEmail.toLowerCase() === userEmail.toLowerCase();
          
          return (nameMatch || emailMatch) && 
                 apt.status !== 'cancelled' && 
                 apt.status !== 'completed';
        });
        
        console.log('✅ Turnos encontrados para el usuario:', userAppointments.length);
        
        if (userAppointments.length > 0) {
          // Ordenar por fecha (más reciente primero)
          userAppointments.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
          });
          
          // Tomar el turno más reciente
          setExistingAppointment(userAppointments[0]);
          console.log('🎯 Turno más reciente encontrado:', userAppointments[0]);
        } else {
          setExistingAppointment(null);
          console.log('❌ No se encontraron turnos activos para el usuario');
        }
      } catch (error) {
        console.error('Error al cargar turnos:', error);
        setExistingAppointment(null);
      } finally {
        setLoadingAppointments(false);
      }
    };

    checkExistingAppointment();
  }, [user, authLoading]);

  // Función para hacer scroll a la confirmación
  const scrollToConfirmation = () => {
    setTimeout(() => {
      if (confirmationAlertRef.current) {
        confirmationAlertRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 300);
  };

  // Función para manejar cuando se selecciona un servicio
  const handleServiceSelected = () => {
    // Cuando se selecciona un servicio, hacer scroll al botón de confirmar
    setTimeout(() => {
      const confirmButton = document.querySelector('.confirm-btn');
      if (confirmButton && window.innerWidth < 768) {
        confirmButton.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        });
      }
    }, 300);
  };

  const handleDateTimeSelect = (date, time) => {
    setSelectedDate(date)
    setSelectedTime(time)
    
    // Si ya había una fecha y hora seleccionada, hacer scroll a la confirmación
    if (date && time && selectedBarber) {
      scrollToConfirmation();
    }
  }

  const handleTimeSelected = () => {
    setTimeout(() => {
      servicesRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
      
      // Después de scroll a servicios, si hay servicios seleccionados, scroll a confirmación
      if (selectedDate && selectedTime && selectedBarber) {
        setTimeout(() => {
          scrollToConfirmation();
        }, 500);
      }
    }, 400)
  }

  const handleBarberSelect = (barber) => {
    setSelectedBarber(barber)
    // Resetear fecha y hora si cambia el peluquero
    setSelectedDate('')
    setSelectedTime('')
    
    // Hacer scroll al calendario después de seleccionar peluquero en móvil
    if (window.innerWidth < 768) {
      setTimeout(() => {
        const calendar = document.querySelector('.appointment-calendar-card');
        if (calendar) {
          calendar.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 300);
    }
  }

  const handleAppointmentCreated = (appointment) => {
    // Marcar que el usuario tiene un turno existente
    setExistingAppointment({ ...appointment, barber: selectedBarber })
    setShowSuccessAlert(false)
    
    console.log('🎯 Navegando a página de confirmación con datos:', appointment)
    
    // Navegar a la página de confirmación con todos los datos
    navigate('/confirmacion', { 
      replace: true,
      state: { 
        appointment: { ...appointment, barber: selectedBarber },
        userName: user.firstName || user.name || user.username || 'Cliente',
        userEmail: user.email,
        userPhone: user.phone
      } 
    })
  }

  const handleCancelAppointment = async () => {
    if (existingAppointment && window.confirm('¿Estás seguro de que quieres cancelar tu turno?')) {
      const success = await cancelAppointment(existingAppointment.id)
      if (success) {
        setExistingAppointment(null)
        setShowSuccessAlert(true)
        setTimeout(() => setShowSuccessAlert(false), 5000)
      } else {
        alert('Error al cancelar el turno')
      }
    }
  }

  const handleModifyAppointment = () => {
    setExistingAppointment(null)
    setSelectedDate('')
    setSelectedTime('')
    setSelectedBarber(null)
  }

  // Función para formatear fecha del turno existente (CORREGIDA)
  const formatAppointmentDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Si la fecha está en DD/MM/YYYY
      if (typeof dateString === 'string' && dateString.includes('/')) {
        const [day, month, year] = dateString.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      // Si está en YYYY-MM-DD
      if (typeof dateString === 'string' && dateString.includes('-')) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      // Si no, intentar parsear normal
      return new Date(dateString).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return dateString; // Mostrar como viene
    }
  };

  // Función para agregar a Google Calendar
  const handleAddToGoogleCalendar = () => {
    if (!existingAppointment) return;
    
    try {
      // Generar enlaces de calendario
      const calendarLinks = generateCalendarLinks(existingAppointment);
      if (calendarLinks.google && calendarLinks.google !== '#') {
        window.open(calendarLinks.google, '_blank');
      } else {
        alert('No se pudo generar el enlace de Google Calendar. Por favor, intenta más tarde.');
      }
    } catch (error) {
      console.error('Error al generar enlace de Google Calendar:', error);
      alert('Error al generar el enlace de Google Calendar.');
    }
  };

  // Mostrar loading mientras se carga la autenticación
  if (authLoading) {
    return (
      <Container className="client-dashboard-container text-center py-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
        <p className="mt-3">Cargando tu perfil...</p>
      </Container>
    )
  }

  // Si no hay usuario después de cargar, mostrar error
  if (!user) {
    return (
      <Container className="client-dashboard-container">
        <Alert variant="danger" className="mt-4">
          <h4><i className="fa-solid fa-exclamation-triangle me-2"></i>Error de autenticación</h4>
          <p>No se pudo cargar tu información de usuario. Por favor, inicia sesión nuevamente.</p>
          <Button 
            variant="danger" 
            onClick={() => navigate('/login')}
            className="mt-2"
          >
            <i className="fa-solid fa-arrow-right-to-bracket me-2"></i>
            Volver al inicio de sesión
          </Button>
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="client-dashboard-container">
      {/* === ALERTA INFORMATIVA SOBRE SEÑA === */}
      {!existingAppointment && (
        <Alert variant="warning" className="deposit-info-alert mb-4">
          <div className="d-flex align-items-start">
            <div className="me-3">
              <i className="fa-solid fa-money-bill-wave fa-2x text-warning"></i>
            </div>
            <div>
              <h5 className="mb-2">
                <i className="fa-solid fa-info-circle me-2"></i>
                ¡Importante! Seña requerida
              </h5>
              <p className="mb-0">
                Para confirmar tu turno, <strong>necesitarás realizar una seña del 50%</strong> del total de los servicios seleccionados mediante <strong>transferencia bancaria</strong>.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* === ALERTA DE TURNO EXISTENTE === */}
      {loadingAppointments ? (
        <div className="text-center mb-4">
          <Spinner animation="border" size="sm" variant="warning" />
          <p className="mt-2 small text-muted">Verificando tus turnos...</p>
        </div>
      ) : existingAppointment && (
        <Alert variant={existingAppointment.status === 'pending' ? 'info' : 'warning'} className="existing-appointment-alert mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start">
            <div className="flex-grow-1 mb-3 mb-md-0">
              {existingAppointment.status === 'pending' ? (
                <>
                  <h5 className="mb-3">
                    <i className="fa-solid fa-clock me-2"></i>
                    ⏳ Tu turno está siendo reservado...
                  </h5>
                  <Alert variant="info" className="mb-3">
                    <i className="fa-solid fa-info-circle me-2"></i>
                    <strong>Estado:</strong> El local está verificando si has hecho la seña.
                    <br />
                    <small>Recibirás confirmación por WhatsApp una vez verificado el pago.</small>
                  </Alert>
                </>
              ) : (
                <h5 className="mb-3">
                  <i className="fa-solid fa-calendar-check me-2"></i>
                  ¡Ya tienes un turno agendado!
                </h5>
              )}
              
              {/* Información del turno en grid */}
              <div className="appointment-details-grid mb-3">
                <div className="appointment-detail-item">
                  <strong>Fecha:</strong>
                  <span>{formatAppointmentDate(existingAppointment.date)}</span>
                </div>
                
                <div className="appointment-detail-item">
                  <strong>Hora:</strong>
                  <span>{existingAppointment.time}</span>
                </div>
                
                {existingAppointment.barber && (
                  <div className="appointment-detail-item">
                    <strong>Peluquero:</strong>
                    <span>{existingAppointment.barber.name}</span>
                  </div>
                )}
                
                <div className="appointment-detail-item">
                  <strong>Servicios:</strong>
                  <span>{existingAppointment.services.map(s => s.name).join(', ')}</span>
                </div>
                
                <div className="appointment-detail-item">
                  <strong>Total:</strong>
                  <span>${existingAppointment.total?.toLocaleString('es-AR')}</span>
                </div>
                
                {existingAppointment.status === 'pending' && existingAppointment.depositAmount > 0 && (
                  <div className="appointment-detail-item">
                    <strong>Seña requerida:</strong>
                    <span className="text-warning">
                      ${existingAppointment.depositAmount?.toLocaleString('es-AR')}
                      <small className="d-block">(50% del total)</small>
                    </span>
                  </div>
                )}
              </div>
              
              {/* Opción para agregar a Google Calendar */}
              <div className="mt-3">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={handleAddToGoogleCalendar}
                  className="btn-calendar me-2 mb-2"
                >
                  <i className="fa-brands fa-google me-2"></i>
                  Agregar a Google Calendar
                </Button>
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="appointment-actions">
              <Button 
                variant="outline-danger" 
                size="sm" 
                onClick={handleCancelAppointment}
                className="me-2 mb-2 w-100"
              >
                <i className="fa-solid fa-times me-1"></i>
                Cancelar Turno
              </Button>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={handleModifyAppointment}
                className="mb-2 w-100"
              >
                <i className="fa-solid fa-pen me-1"></i>
                Modificar Turno
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* Alerta de cancelación exitosa */}
      {showSuccessAlert && (
        <Alert variant="success" className="mb-4" dismissible onClose={() => setShowSuccessAlert(false)}>
          <i className="fa-solid fa-check-circle me-2"></i>
          Turno cancelado exitosamente
        </Alert>
      )}

      <Alert variant="info" className="welcome-alert">
        <h3>
          <i className="fa-solid fa-hand-wave me-2"></i>
          ¡Hola, {user.firstName || user.name || user.username || 'Cliente'}!
        </h3>
        <p className="mb-0">
          {existingAppointment ? 
            'Puedes modificar tu turno existente o agendar uno nuevo' : 
            'Agenda tu turno en la peluquería'
          }
        </p>
      </Alert>

      <Row>
        <Col lg={6} className="mb-4">
          <AppointmentCalendar 
            onDateTimeSelect={handleDateTimeSelect}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onDateSelected={() => {
              // Cuando se selecciona una fecha, scroll a horarios
              setTimeout(() => {
                const timeSlots = document.querySelector('.time-selection');
                if (timeSlots && window.innerWidth < 768) {
                  timeSlots.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  });
                }
              }, 300);
            }}
            onTimeSelected={handleTimeSelected}
            confirmationAlertRef={confirmationAlertRef}
            selectedBarber={selectedBarber}
            onBarberSelect={handleBarberSelect}
          />
        </Col>
        
        <Col lg={6}>
          <div ref={servicesRef}>
            <AppointmentForm 
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onAppointmentCreated={handleAppointmentCreated}
              existingAppointment={existingAppointment}
              onServiceSelected={handleServiceSelected}
              selectedBarber={selectedBarber}
            />
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default ClientDashboard
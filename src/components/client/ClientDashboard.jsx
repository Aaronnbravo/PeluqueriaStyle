import React, { useState, useRef, useEffect } from 'react'
import { Container, Row, Col, Alert, Button, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import AppointmentCalendar from './AppointmentCalendar'
import AppointmentForm from './AppointmentForm'
import { useAuth } from '../../hooks/useAuth'
import { getAppointments, cancelAppointment } from '../../services/appointments'
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

  // useEffect corregido
  useEffect(() => {
    if (!user || authLoading) return

    const checkExistingAppointment = async () => {
      setLoadingAppointments(true)
      try {
        const appointments = await getAppointments()
        const userName = user.username || user.firstName || user.name || user.email
        
        // DEBUG: Ver todos los turnos del usuario
        console.log('🔍 Turnos encontrados en Firestore:', appointments);
        
        const userAppointment = appointments.find(apt => {
          const appointmentName = apt.clientName || ''
          
          // DEBUG: Ver cada comparación
          console.log(`Comparando: 
            Usuario: ${userName}
            Turno: ${appointmentName}
            Email: ${apt.email} vs ${user.email}
            Fecha: ${apt.date}
            Fecha display: ${apt.dateDisplay}
          `);
          
          return (
            (appointmentName.includes(userName) || 
             userName.includes(appointmentName) ||
             apt.email === user.email) && 
            apt.status === 'confirmed'
          )
        })
        
        console.log('✅ Turno encontrado para el usuario:', userAppointment);
        setExistingAppointment(userAppointment || null)
      } catch (error) {
        console.error('Error al cargar turnos:', error)
      } finally {
        setLoadingAppointments(false)
      }
    }

    checkExistingAppointment()
  }, [user, authLoading])

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
      {/* === ALERTA DE TURNO EXISTENTE === */}
      {loadingAppointments ? (
        <div className="text-center mb-4">
          <Spinner animation="border" size="sm" variant="warning" />
          <p className="mt-2 small text-muted">Verificando tus turnos...</p>
        </div>
      ) : existingAppointment && (
        <Alert variant="warning" className="existing-appointment-alert mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start">
            <div className="flex-grow-1 mb-3 mb-md-0">
              <h5 className="mb-3">
                <i className="fa-solid fa-calendar-check me-2"></i>
                ¡Ya tienes un turno agendado!
              </h5>
              <Row>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Fecha:</strong> {formatAppointmentDate(existingAppointment.date)}
                  </p>
                  <p className="mb-2">
                    <strong>Hora:</strong> {existingAppointment.time}
                  </p>
                  {existingAppointment.barber && (
                    <p className="mb-2">
                      <strong>Peluquero:</strong> {existingAppointment.barber.name}
                    </p>
                  )}
                </Col>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Servicios:</strong> {existingAppointment.services.map(s => s.name).join(', ')}
                  </p>
                  <p className="mb-0">
                    <strong>Total:</strong> ${existingAppointment.total}
                  </p>
                </Col>
              </Row>
            </div>
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
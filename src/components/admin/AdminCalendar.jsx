import React, { useState, useEffect } from 'react'
import { Card, Table, Badge, Button, Form, Modal, Row, Col } from 'react-bootstrap'
import { getAppointments, getAllTimeSlots, getLocalDateString, updateAppointmentStatus } from '../../services/appointments'
import ManualAppointment from './ManualAppointment'

function AdminCalendar() {
  // Fecha inicial: hoy en formato local
  const today = new Date();
  const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [appointments, setAppointments] = useState([])
  const [selectedDate, setSelectedDate] = useState(todayLocal)
  const [showModal, setShowModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [timeSlots, setTimeSlots] = useState([])
  const [showManualAppointment, setShowManualAppointment] = useState(false)
  const [selectedTimeForManual, setSelectedTimeForManual] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Forzar recarga cada 30 segundos y cuando cambia la fecha
  useEffect(() => {
    console.log('=== DEBUG CALENDARIO ===');
    console.log('📅 Fecha seleccionada:', selectedDate);
    
    loadData()
    
    // Actualizar automáticamente cada 30 segundos
    const interval = setInterval(loadData, 30000)
    
    return () => clearInterval(interval)
  }, [selectedDate, refreshTrigger])

const loadData = async () => {
  try {
    setLoading(true)
    const allAppointments = await getAppointments()
    const slots = getAllTimeSlots()
    setAppointments(allAppointments)
    setTimeSlots(slots)
    
    // DEBUG: Mostrar información de los turnos
    console.log('📊=== DEBUG CALENDARIO ===')
    console.log('📊 Total turnos cargados:', allAppointments.length)
    
    // Mostrar los primeros 5 turnos para debug
    allAppointments.slice(0, 5).forEach((apt, idx) => {
      console.log(`Turno ${idx + 1}:`, {
        cliente: apt.clientName,
        fecha: apt.date,
        hora: apt.time,
        estado: apt.status
      })
    })
    
    // Buscar específicamente turnos para la fecha seleccionada
    const turnosParaFecha = allAppointments.filter(apt => {
      if (!apt || !apt.date) return false;
      
      // Normalizar fecha del turno a YYYY-MM-DD
      const aptDateNormalized = normalizeDateForComparison(apt.date);
      const selectedDateNormalized = normalizeDateForComparison(selectedDate);
      
      const matches = aptDateNormalized === selectedDateNormalized;
      
      if (matches) {
        console.log(`🎯 Turno encontrado para ${selectedDate}:`, {
          cliente: apt.clientName,
          hora: apt.time,
          fechaOriginal: apt.date,
          fechaNormalizada: aptDateNormalized
        })
      }
      
      return matches;
    })
    
    console.log(`✅ Turnos para ${selectedDate}:`, turnosParaFecha.length)
    
  } catch (error) {
    console.error('❌ Error cargando datos:', error)
    setAppointments([])
    setTimeSlots([])
  } finally {
    setLoading(false)
  }
}
  // Función para normalizar fechas a YYYY-MM-DD
  const normalizeDateForComparison = (dateStr) => {
    if (!dateStr) return '';
    
    console.log('🔄 Normalizando fecha:', dateStr, 'tipo:', typeof dateStr);
    
    // Si ya es YYYY-MM-DD
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Si es DD/MM/YYYY (como se muestra en la tabla de Turnos Totales)
    if (typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log(`   Convertido de DD/MM/YYYY a YYYY-MM-DD: ${dateStr} -> ${normalized}`);
      return normalized;
    }
    
    // Si es un objeto Date o timestamp
    try {
      // Usar getLocalDateString que ya tiene la lógica de conversión
      const normalized = getLocalDateString(dateStr);
      console.log(`   Usando getLocalDateString: ${dateStr} -> ${normalized}`);
      return normalized;
    } catch (error) {
      console.error('Error en normalizeDateForComparison:', error);
      return '';
    }
  }

  // Filtrar turnos usando fecha normalizada
  const appointmentsForSelectedDate = appointments.filter(apt => {
    if (!apt || !apt.date) return false;
    
    const aptDateNormalized = normalizeDateForComparison(apt.date);
    const selectedDateNormalized = normalizeDateForComparison(selectedDate);
    
    console.log('🔍 Comparando:', {
      cliente: apt.clientName,
      fechaOriginal: apt.date,
      fechaNormalizada: aptDateNormalized,
      fechaSeleccionada: selectedDateNormalized,
      coincide: aptDateNormalized === selectedDateNormalized
    });
    
    return aptDateNormalized === selectedDateNormalized;
  });

  // Crear mapa de horarios ocupados
  const bookedSlotsMap = {}
  appointmentsForSelectedDate.forEach(apt => {
    if (apt && apt.time) {
      bookedSlotsMap[apt.time] = apt
    }
  })

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment)
    setShowModal(true)
  }

  // Función mejorada para obtener color según estado
  const getStatusVariant = (status) => {
    switch (status) {
      case 'pending': return 'warning'     // Pendiente - Amarillo
      case 'confirmed': return 'primary'   // Confirmado - Azul
      case 'in_progress': return 'info'    // En progreso - Celeste
      case 'completed': return 'success'   // Terminado - Verde
      case 'cancelled': return 'danger'    // Cancelado - Rojo
      default: return 'secondary'
    }
  }

  // Función para obtener texto del estado
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'confirmed': return 'Confirmado'
      case 'in_progress': return 'En Progreso'
      case 'completed': return 'Terminado'
      case 'cancelled': return 'Cancelado'
      default: return 'Desconocido'
    }
  }

  // Función para cambiar estado desde el calendario
  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const success = await updateAppointmentStatus(appointmentId, newStatus)
      if (success) {
        // Forzar recarga de datos
        setRefreshTrigger(prev => prev + 1)
        setShowModal(false)
      }
    } catch (error) {
      console.error('Error cambiando estado:', error)
    }
  }

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Primero normalizar la fecha
    const normalizedDate = normalizeDateForComparison(dateString);
    
    // Crear fecha a partir de la normalizada
    const [year, month, day] = normalizedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires'
    });
  }

  // Manejar cambio de fecha
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    console.log('📅 Cambiando fecha a:', newDate);
    setSelectedDate(newDate);
  }

  // Función para obtener clase CSS según estado (para color de fondo)
  const getAppointmentCardClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending'
      case 'confirmed': return 'status-confirmed'
      case 'in_progress': return 'status-in-progress'
      case 'completed': return 'status-completed'
      case 'cancelled': return 'status-cancelled'
      default: return 'status-default'
    }
  }

  return (
    <div>
      {/* Vista tipo Google Calendar */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-calendar-days"></i> Agenda del Día - {formatDate(selectedDate)}
          </h5>
          <div className="d-flex align-items-center gap-3">
            <Form.Group className="mb-0">
              <Form.Control
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="calendar-date-picker"
              />
            </Form.Group>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => {
                console.log('🔄 Refrescando datos...');
                setRefreshTrigger(prev => prev + 1)
              }}
              title="Actualizar"
            >
              <i className="fas fa-sync-alt"></i>
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-3">Cargando agenda...</p>
            </div>
          ) : (
            <div className="calendar-grid">
              <Row className="calendar-header">
                <Col md={2}>
                  <strong>Hora</strong>
                </Col>
                <Col md={10}>
                  <strong>Turnos Programados ({appointmentsForSelectedDate.length})</strong>
                </Col>
              </Row>
              
              {timeSlots.map(time => {
                const appointment = bookedSlotsMap[time]
                const isBooked = !!appointment
                
                return (
                  <Row key={time} className={`calendar-time-slot ${isBooked ? 'booked' : 'available'}`}>
                    <Col md={2} className="time-column">
                      <Badge bg={isBooked ? "danger" : "secondary"} className="time-badge">
                        {time}
                      </Badge>
                    </Col>
                    <Col md={10} className="appointment-column">
                      {isBooked ? (
                        <div 
                          className={`appointment-card ${getAppointmentCardClass(appointment.status)}`}
                          onClick={() => handleAppointmentClick(appointment)}
                        >
                          <div className="appointment-content">
                            <div className="appointment-header">
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <strong>{appointment.clientName}</strong>
                                  <Badge bg={getStatusVariant(appointment.status)} className="ms-2">
                                    {getStatusText(appointment.status)}
                                  </Badge>
                                </div>
                                <small className="text-muted">
                                  <i className="fas fa-clock me-1"></i>
                                  {appointment.duration} min
                                </small>
                              </div>
                            </div>
                            <div className="appointment-details">
                              <small>
                                <i className="fas fa-phone me-1"></i> {appointment.phone} • 
                                <i className="fas fa-scissors me-1"></i> {appointment.services?.map(s => s.name).join(', ') || 'Sin servicios'} • 
                                <i className="fas fa-dollar-sign me-1"></i> ${appointment.total || 0}
                              </small>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="time-slot-empty">
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">Disponible</small>
                            <Button 
                              variant="danger" 
                              size="sm" 
                              className="agendar-btn"
                              onClick={() => {
                                setSelectedTimeForManual(time)
                                setShowManualAppointment(true)
                              }}
                            >
                              <i className="fas fa-plus me-1"></i>
                              Agendar
                            </Button>
                          </div>
                        </div>
                      )}
                    </Col>
                  </Row>
                )
              })}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Tabla tradicional */}
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="fas fa-list"></i> Lista de Turnos del Día</h5>
            <Badge bg="info">
              {appointmentsForSelectedDate.length} turnos
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-2 small">Cargando turnos...</p>
            </div>
          ) : appointmentsForSelectedDate.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Servicios</th>
                  <th>Duración</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {appointmentsForSelectedDate
                  .sort((a, b) => a.time?.localeCompare(b.time) || 0)
                  .map(appointment => (
                    <tr key={appointment.id} className={getAppointmentCardClass(appointment.status)}>
                      <td>
                        <Badge bg="primary">{appointment.time || 'Sin hora'}</Badge>
                      </td>
                      <td>
                        <div>
                          <strong>{appointment.clientName}</strong>
                          <br />
                          <small className="text-muted">
                            <i className="fas fa-phone me-1"></i> {appointment.phone || 'Sin teléfono'}
                          </small>
                        </div>
                      </td>
                      <td>
                        {appointment.services?.map(service => service.name).join(', ') || 'Sin servicios'}
                      </td>
                      <td>{appointment.duration || 0} min</td>
                      <td>
                        <Badge bg="success">${appointment.total || 0}</Badge>
                      </td>
                      <td>
                        <Badge bg={getStatusVariant(appointment.status)}>
                          {getStatusText(appointment.status)}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => handleAppointmentClick(appointment)}
                            title="Ver detalles"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          {appointment.status === 'pending' || appointment.status === 'confirmed' ? (
                            <Button 
                              variant="outline-info" 
                              size="sm"
                              onClick={() => handleStatusChange(appointment.id, 'in_progress')}
                              title="Iniciar atención"
                            >
                              <i className="fas fa-play"></i>
                            </Button>
                          ) : null}
                          {appointment.status === 'in_progress' ? (
                            <Button 
                              variant="outline-success" 
                            size="sm"
                              onClick={() => handleStatusChange(appointment.id, 'completed')}
                              title="Marcar como terminado"
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-4">
              <i className="fas fa-calendar-times fa-2x mb-3"></i>
              <h6>No hay turnos para esta fecha</h6>
              <p>Selecciona otra fecha o espera nuevos turnos</p>
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => setShowManualAppointment(true)}
              >
                <i className="fas fa-plus me-1"></i>
                Crear Turno Manual
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal para ver detalles del turno */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-calendar-alt me-2"></i>
            Detalles del Turno
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAppointment && (
            <div>
              <Row className="mb-3">
                <Col md={8}>
                  <div className="d-flex align-items-center mb-3">
                    <div className="me-3">
                      <i className="fas fa-user-circle fa-2x text-primary"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">{selectedAppointment.clientName}</h5>
                      <div className="mb-2">
                        <Badge bg={getStatusVariant(selectedAppointment.status)} className="me-2">
                          {getStatusText(selectedAppointment.status)}
                        </Badge>
                        <Badge bg="secondary">{selectedAppointment.time}</Badge>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col md={4} className="text-end">
                  <div className="btn-group" role="group">
                    {selectedAppointment.status === 'pending' || selectedAppointment.status === 'confirmed' ? (
                      <Button
                        variant="info"
                        size="sm"
                        onClick={() => handleStatusChange(selectedAppointment.id, 'in_progress')}
                      >
                        <i className="fas fa-play me-1"></i>
                        Iniciar
                      </Button>
                    ) : null}
                    {selectedAppointment.status === 'in_progress' ? (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleStatusChange(selectedAppointment.id, 'completed')}
                      >
                        <i className="fas fa-check me-1"></i>
                        Terminar
                      </Button>
                    ) : null}
                    {selectedAppointment.status === 'completed' ? (
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => handleStatusChange(selectedAppointment.id, 'confirmed')}
                      >
                        <i className="fas fa-undo me-1"></i>
                        Reabrir
                      </Button>
                    ) : null}
                  </div>
                </Col>
              </Row>
              
              <Row>
                <Col md={6}>
                  <p><strong><i className="fas fa-phone me-2"></i>Teléfono:</strong><br />
                  {selectedAppointment.phone}</p>
                  
                  <p><strong><i className="fas fa-envelope me-2"></i>Email:</strong><br />
                  {selectedAppointment.email || 'No especificado'}</p>
                  
                  <p><strong><i className="fas fa-calendar-day me-2"></i>Fecha:</strong><br />
                  {formatDate(selectedAppointment.date)}</p>
                  
                  <p><strong><i className="fas fa-clock me-2"></i>Hora:</strong><br />
                  {selectedAppointment.time}</p>
                </Col>
                
                <Col md={6}>
                  <p><strong><i className="fas fa-scissors me-2"></i>Servicios:</strong></p>
                  {selectedAppointment.services && selectedAppointment.services.length > 0 ? (
                    <ul className="list-group mb-3">
                      {selectedAppointment.services.map(service => (
                        <li key={service.id} className="list-group-item d-flex justify-content-between align-items-center">
                          {service.name}
                          <Badge bg="primary" pill>
                            ${service.price}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">Sin servicios especificados</p>
                  )}
                  
                  <p><strong><i className="fas fa-dollar-sign me-2"></i>Total:</strong> 
                  <span className="fs-5 text-success ms-2">${selectedAppointment.total || 0}</span></p>
                  
                  <p><strong><i className="fas fa-credit-card me-2"></i>Método de pago:</strong><br />
                  {selectedAppointment.paymentMethod || 'No especificado'}</p>
                  
                  <p><strong><i className="fas fa-sticky-note me-2"></i>Notas:</strong><br />
                  {selectedAppointment.notes || 'Ninguna'}</p>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para agendar turno manualmente */}
      <ManualAppointment 
        show={showManualAppointment}
        onHide={() => {
          setShowManualAppointment(false)
          setRefreshTrigger(prev => prev + 1) // Forzar recarga después de agendar
        }}
        selectedDate={selectedDate}
        selectedTime={selectedTimeForManual}
      />
    </div>
  )
}

export default AdminCalendar
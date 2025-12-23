import React, { useState, useEffect } from 'react'
import { Card, Table, Badge, Button, Form, Modal, Row, Col, Alert } from 'react-bootstrap'
import { 
  getAppointmentsByDate,  // USAR ESTA FUNCIÓN DIRECTAMENTE
  getAllTimeSlots, 
  updateAppointmentStatus
} from '../../services/appointments'
import ManualAppointment from './ManualAppointment'
import { useAuth } from '../../hooks/useAuth'

function AdminCalendar() {
  // Fecha inicial: hoy en formato YYYY-MM-DD (igual que Firestore)
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
  
  // Obtener barberId del usuario actual
  const { getBarberId, getBarberName } = useAuth()
  const currentBarberId = getBarberId()
  const currentBarberName = getBarberName()
  
  console.log('🎯 CALENDARIO INICIADO');
  console.log('📅 Fecha inicial:', selectedDate);
  console.log('💇 Peluquero:', currentBarberName, 'ID:', currentBarberId);
  
  // Función para obtener el objeto barber completo
  const getCurrentBarberObject = () => {
    if (currentBarberId === 'mili') {
      return {
        id: 'mili',
        name: 'Mili',
        interval: 45,
        description: 'Coloración y estilismo'
      }
    } else if (currentBarberId === 'santi') {
      return {
        id: 'santi',
        name: 'Santiago',
        interval: 30,
        description: 'Corte clásico y moderno'
      }
    }
    return null
  }

  // Cargar datos - VERSIÓN SIMPLIFICADA Y DIRECTA
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('='.repeat(50));
      console.log('📥 CARGANDO TURNOS...');
      console.log(`📅 Para fecha: ${selectedDate}`);
      console.log(`💇 Para peluquero: ${currentBarberName} (${currentBarberId})`);
      
      // 1. Obtener turnos ESPECÍFICOS para esta fecha y este peluquero
      const appointmentsForDate = await getAppointmentsByDate(selectedDate, currentBarberId);
      
      console.log(`✅ TURNOS ENCONTRADOS: ${appointmentsForDate.length}`);
      
      // Mostrar cada turno en consola
      appointmentsForDate.forEach((apt, idx) => {
        console.log(`   [${idx}] ${apt.clientName} - ${apt.time} - Peluquero: ${apt.barberId || apt.barber?.id} - Estado: ${apt.status}`);
      });
      
      // Guardar los turnos
      setAppointments(appointmentsForDate);
      
      // 2. Obtener slots para este peluquero específico
      const barberObject = getCurrentBarberObject();
      const slots = getAllTimeSlots(barberObject);
      console.log(`⏰ Slots generados: ${slots.length} (intervalo: ${barberObject?.interval || 30} min)`);
      
      setTimeSlots(slots);
      
    } catch (error) {
      console.error('❌ ERROR cargando datos:', error);
      setAppointments([]);
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar cuando cambia la fecha o se fuerza recarga
  useEffect(() => {
    console.log('🔄 useEffect ejecutado');
    loadData();
    
    // Actualizar automáticamente cada 30 segundos
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, [selectedDate, refreshTrigger]);

  // Crear mapa de horarios ocupados
  const bookedSlotsMap = {};
  appointments.forEach(apt => {
    if (apt && apt.time) {
      bookedSlotsMap[apt.time] = apt;
      console.log(`📌 Slot ${apt.time} ocupado por ${apt.clientName} (Estado: ${apt.status})`);
    }
  });

  // Manejar clic en turno
  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  // Cambiar estado del turno - MEJORADA
  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      let confirmMessage = '';
      
      switch(newStatus) {
        case 'confirmed':
          confirmMessage = '¿Confirmar este turno? Esto significa que la seña ha sido verificada.';
          break;
        case 'cancelled':
          confirmMessage = '¿Cancelar este turno? Esta acción no se puede deshacer fácilmente.';
          break;
        case 'in_progress':
          confirmMessage = '¿Iniciar la atención de este turno?';
          break;
        case 'completed':
          confirmMessage = '¿Marcar este turno como terminado?';
          break;
        default:
          confirmMessage = `¿Cambiar el estado del turno a ${getStatusText(newStatus)}?`;
      }
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
      
      const success = await updateAppointmentStatus(appointmentId, newStatus);
      if (success) {
        // Mostrar mensaje de éxito
        alert(`✅ Turno ${getStatusText(newStatus).toLowerCase()} exitosamente`);
        
        // Actualizar la lista
        setRefreshTrigger(prev => prev + 1);
        setShowModal(false);
        
        // Si se confirmó un turno pendiente, podemos enviar notificación al cliente
        if (newStatus === 'confirmed') {
          // Buscar el turno para obtener datos del cliente
          const appointmentToConfirm = appointments.find(apt => apt.id === appointmentId);
          if (appointmentToConfirm) {
            console.log('📱 Turno confirmado, se podría enviar notificación a:', appointmentToConfirm.clientName);
            // Aquí podrías agregar una función para enviar WhatsApp al cliente
          }
        }
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('❌ Error al cambiar el estado del turno');
    }
  };

  // Formatear fecha para mostrar
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Si ya es YYYY-MM-DD
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        return date.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      // Si es DD/MM/YYYY
      if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        
        return date.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      return dateString;
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return dateString;
    }
  };

  // Obtener nombre del peluquero para mostrar
  const getBarberDisplay = (appointment) => {
    if (appointment.barberName) return appointment.barberName;
    if (appointment.barber?.name) return appointment.barber.name;
    if (appointment.barberId === 'mili') return 'Mili';
    if (appointment.barberId === 'santi') return 'Santiago';
    return appointment.barberId || 'No asignado';
  };

  // Obtener variante de estado
  const getStatusVariant = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'primary';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  // Obtener texto del estado
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '⏳ Pendiente';
      case 'confirmed': return '✅ Confirmado';
      case 'in_progress': return '🔄 En Progreso';
      case 'completed': return '🏁 Terminado';
      case 'cancelled': return '❌ Cancelado';
      default: return '❓ Desconocido';
    }
  };

  // Clase CSS según estado
  const getAppointmentCardClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'in_progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-default';
    }
  };

  return (
    <div>
      {/* Vista tipo Google Calendar */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-calendar-days"></i> Agenda del Día - {formatDateForDisplay(selectedDate)} - {currentBarberName}
            <small className="text-muted ms-2">
              (Intervalo: {currentBarberId === 'mili' ? '45' : '30'} minutos)
            </small>
          </h5>
          <div className="d-flex align-items-center gap-3">
            <Form.Group className="mb-0">
              <Form.Control
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  console.log('📅 Cambiando fecha a:', e.target.value);
                  setSelectedDate(e.target.value);
                }}
                className="calendar-date-picker"
              />
            </Form.Group>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => {
                console.log('🔄 Forzando recarga...');
                setRefreshTrigger(prev => prev + 1);
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
              <small className="text-muted">
                Buscando turnos para {currentBarberName} el {formatDateForDisplay(selectedDate)}
              </small>
            </div>
          ) : (
            <>
              {/* Información del estado */}
              <Alert variant={appointments.length > 0 ? 'success' : 'info'} className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>{appointments.length}</strong> turnos para {currentBarberName} el {formatDateForDisplay(selectedDate)}
                    <div className="mt-1 small">
                      {appointments.filter(a => a.status === 'pending').length} ⏳ Pendientes • 
                      {appointments.filter(a => a.status === 'confirmed').length} ✅ Confirmados • 
                      {appointments.filter(a => a.status === 'in_progress').length} 🔄 En Progreso
                    </div>
                  </div>
                  <Badge bg="primary">
                    {currentBarberName} (ID: {currentBarberId})
                  </Badge>
                </div>
              </Alert>
              
              {/* Grid del calendario */}
              <div className="calendar-grid">
                <Row className="calendar-header">
                  <Col md={2}>
                    <strong>Hora</strong>
                  </Col>
                  <Col md={10}>
                    <strong>Turnos Programados</strong>
                    <small className="text-muted ms-2">
                      • {currentBarberName} • Intervalo: {currentBarberId === 'mili' ? '45' : '30'} min
                    </small>
                  </Col>
                </Row>
                
                {timeSlots.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="fas fa-clock fa-2x mb-2"></i>
                    <p>No se generaron slots de horario</p>
                  </div>
                ) : (
                  timeSlots.map(time => {
                    const appointment = bookedSlotsMap[time];
                    const isBooked = !!appointment;
                    
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
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="appointment-content">
                                <div className="appointment-header">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                      <strong>{appointment.clientName}</strong>
                                      <Badge bg={getStatusVariant(appointment.status)} className="ms-2">
                                        {getStatusText(appointment.status)}
                                      </Badge>
                                      <small className="ms-2 text-muted">
                                        <i className="fas fa-user me-1"></i>
                                        {getBarberDisplay(appointment)}
                                      </small>
                                    </div>
                                    <div>
                                      <small className="text-muted me-2">
                                        <i className="fas fa-clock me-1"></i>
                                        {appointment.duration} min
                                      </small>
                                      <Badge bg="success">
                                        ${appointment.total || 0}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="appointment-details">
                                  <small>
                                    <i className="fas fa-phone me-1"></i> {appointment.phone || 'Sin teléfono'} • 
                                    <i className="fas fa-scissors me-2 ms-1"></i> {appointment.services?.map(s => s.name).join(', ') || 'Sin servicios'}
                                  </small>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="time-slot-empty">
                              <div className="d-flex justify-content-between align-items-center">
                                <small className="text-muted">Disponible para {currentBarberName}</small>
                                <Button 
                                  variant="danger" 
                                  size="sm" 
                                  className="agendar-btn"
                                  onClick={() => {
                                    setSelectedTimeForManual(time);
                                    setShowManualAppointment(true);
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
                    );
                  })
                )}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Tabla tradicional */}
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-list"></i> Lista de Turnos del Día - {currentBarberName}
            </h5>
            <Badge bg="primary">
              {appointments.length} turnos
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          {appointments.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Peluquero</th>
                  <th>Servicios</th>
                  <th>Duración</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {appointments
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
                        <Badge bg="info">
                          <i className="fas fa-user me-1"></i>
                          {getBarberDisplay(appointment)}
                        </Badge>
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
                          
                          {/* Botón rápido para confirmar turnos pendientes */}
                          {appointment.status === 'pending' && (
                            <Button 
                              variant="outline-success" 
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`¿Confirmar turno de ${appointment.clientName}?`)) {
                                  handleStatusChange(appointment.id, 'confirmed');
                                }
                              }}
                              title="Confirmar turno"
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                          )}
                          
                          {/* Botón para cancelar */}
                          {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`¿Cancelar turno de ${appointment.clientName}?`)) {
                                  handleStatusChange(appointment.id, 'cancelled');
                                }
                              }}
                              title="Cancelar turno"
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          )}
                          
                          {appointment.status === 'confirmed' ? (
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
              <p className="mb-3">No se encontraron turnos para {currentBarberName} el {formatDateForDisplay(selectedDate)}</p>
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

      {/* Modal de detalles - ACTUALIZADO */}
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
                        <Badge bg="info" className="ms-2">
                          <i className="fas fa-user me-1"></i>
                          {getBarberDisplay(selectedAppointment)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col md={4} className="text-end">
                  {/* Botones para cambiar estado */}
                  <div className="btn-group-vertical" role="group" style={{ minWidth: '120px' }}>
                    {/* Botón para confirmar turnos PENDIENTES */}
                    {selectedAppointment.status === 'pending' && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleStatusChange(selectedAppointment.id, 'confirmed')}
                          className="mb-2"
                        >
                          <i className="fas fa-check-circle me-1"></i>
                          Confirmar Turno
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`¿Cancelar el turno de ${selectedAppointment.clientName}?`)) {
                              handleStatusChange(selectedAppointment.id, 'cancelled');
                            }
                          }}
                        >
                          <i className="fas fa-times me-1"></i>
                          Cancelar
                        </Button>
                      </>
                    )}
                    
                    {/* Botón para iniciar turnos CONFIRMADOS */}
                    {selectedAppointment.status === 'confirmed' && (
                      <Button
                        variant="info"
                        size="sm"
                        onClick={() => handleStatusChange(selectedAppointment.id, 'in_progress')}
                      >
                        <i className="fas fa-play me-1"></i>
                        Iniciar Atención
                      </Button>
                    )}
                    
                    {/* Botón para terminar turnos EN PROGRESO */}
                    {selectedAppointment.status === 'in_progress' && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleStatusChange(selectedAppointment.id, 'completed')}
                      >
                        <i className="fas fa-check me-1"></i>
                        Terminar Atención
                      </Button>
                    )}
                    
                    {/* Botón para reabrir turnos TERMINADOS */}
                    {selectedAppointment.status === 'completed' && (
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => handleStatusChange(selectedAppointment.id, 'confirmed')}
                      >
                        <i className="fas fa-undo me-1"></i>
                        Reabrir Turno
                      </Button>
                    )}
                    
                    {/* Botón para reactivar turnos CANCELADOS */}
                    {selectedAppointment.status === 'cancelled' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusChange(selectedAppointment.id, 'pending')}
                      >
                        <i className="fas fa-redo me-1"></i>
                        Reactivar
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>
              
              {/* Información de señal para turnos pendientes */}
              {selectedAppointment.status === 'pending' && selectedAppointment.depositAmount > 0 && (
                <Alert variant="warning" className="mb-3">
                  <h6>
                    <i className="fas fa-money-bill-wave me-2"></i>
                    Información de Seña
                  </h6>
                  <Row>
                    <Col md={6}>
                      <p className="mb-1"><strong>Monto requerido:</strong> ${selectedAppointment.depositAmount?.toLocaleString('es-AR') || '0'}</p>
                      <p className="mb-1"><strong>Estado:</strong> {selectedAppointment.depositStatus === 'pending' ? '❌ PENDIENTE' : '✅ PAGADA'}</p>
                    </Col>
                    <Col md={6}>
                      <p className="mb-1"><strong>Método:</strong> {selectedAppointment.depositPaymentMethod || 'Transferencia'}</p>
                      <p className="mb-0"><strong>Pagado el:</strong> {selectedAppointment.depositPaidAt ? new Date(selectedAppointment.depositPaidAt).toLocaleDateString('es-ES') : 'No pagado'}</p>
                    </Col>
                  </Row>
                  <hr />
                  <p className="mb-0">
                    <strong>Instrucción:</strong> Confirma el turno solo después de verificar el pago de la seña.
                  </p>
                </Alert>
              )}
              
              <Row>
                <Col md={6}>
                  <p><strong><i className="fas fa-phone me-2"></i>Teléfono:</strong><br />
                  {selectedAppointment.phone}</p>
                  
                  <p><strong><i className="fas fa-envelope me-2"></i>Email:</strong><br />
                  {selectedAppointment.email || 'No especificado'}</p>
                  
                  <p><strong><i className="fas fa-calendar-day me-2"></i>Fecha:</strong><br />
                  {formatDateForDisplay(selectedAppointment.date)}</p>
                  
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
                            ${service.price || 0}
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
              
              {/* Información de creación */}
              <div className="mt-3 pt-3 border-top">
                <p className="text-muted small mb-0">
                  <i className="fas fa-calendar-plus me-1"></i>
                  Creado: {selectedAppointment.createdAt ? new Date(selectedAppointment.createdAt).toLocaleString('es-ES') : 'No disponible'}
                  {selectedAppointment.updatedAt && selectedAppointment.updatedAt !== selectedAppointment.createdAt && (
                    <>
                      <br />
                      <i className="fas fa-edit me-1"></i>
                      Actualizado: {new Date(selectedAppointment.updatedAt).toLocaleString('es-ES')}
                    </>
                  )}
                </p>
              </div>
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
          setShowManualAppointment(false);
          setRefreshTrigger(prev => prev + 1);
        }}
        selectedDate={selectedDate}
        selectedTime={selectedTimeForManual}
        currentBarberId={currentBarberId}
        currentBarberName={currentBarberName}
      />
    </div>
  )
}

export default AdminCalendar
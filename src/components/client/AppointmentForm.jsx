import React, { useState } from 'react';
import { Card, Form, Button, Alert, ListGroup, Row, Col } from 'react-bootstrap';
import { getServices, getPaymentMethods, createAppointmentWithNotifications } from '../../services/appointments';
import { useAuth } from '../../hooks/useAuth';

function AppointmentForm({ selectedDate, selectedTime, onAppointmentCreated, existingAppointment, onServiceSelected, selectedBarber }) {
  const { user } = useAuth();
  const [services] = useState(getServices());
  const [paymentMethods] = useState(getPaymentMethods());
  const [selectedServices, setSelectedServices] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Función para convertir fecha a DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';

    console.log('🔄 formatDateToDDMMYYYY input:', dateString, 'tipo:', typeof dateString);

    // Si ya está en DD/MM/YYYY, dejarlo así
    if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      console.log('✅ Ya está en DD/MM/YYYY:', dateString);
      return dateString;
    }

    // Si está en YYYY-MM-DD, convertir a DD/MM/YYYY
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      const result = `${day}/${month}/${year}`;
      console.log('🔄 YYYY-MM-DD -> DD/MM/YYYY:', dateString, '->', result);
      return result;
    }

    // Si es Date object o string con T, convertir a DD/MM/YYYY
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('❌ Fecha inválida:', dateString);
        return dateString;
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const result = `${day}/${month}/${year}`;
      console.log('📅 Date -> DD/MM/YYYY:', dateString, '->', result);
      return result;
    } catch (error) {
      console.error('❌ Error convirtiendo fecha:', error);
      return dateString;
    }
  };


  const total = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);

  const handleServiceToggle = (service) => {
    setSelectedServices(prev => {
      const isSelected = prev.find(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      } else {
        const newSelection = [...prev, service];
        // Llamar al callback cuando se selecciona un servicio
        if (onServiceSelected) {
          onServiceSelected();
        }
        return newSelection;
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones adicionales
    if (!selectedBarber) {
      setError('Por favor selecciona un peluquero primero');
      return;
    }

    // Si ya tiene turno, no permitir agendar otro
    if (existingAppointment) {
      setError('Ya tienes un turno agendado. Cancela o modifica tu turno existente primero.');
      return;
    }

    if (!selectedDate || !selectedTime) {
      setError('Por favor selecciona fecha y hora');
      return;
    }

    if (selectedServices.length === 0) {
      setError('Por favor selecciona al menos un servicio');
      return;
    }

    if (!paymentMethod) {
      setError('Por favor selecciona un método de pago');
      return;
    }

    // Mostrar confirmación
    setShowConfirmation(true);

    // Scroll automático al modal en móvil
    setTimeout(() => {
      const modal = document.querySelector('.confirmation-modal');
      if (modal && window.innerWidth < 768) {
        modal.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  };

 const confirmAppointment = async () => {
  setLoading(true);
  setShowConfirmation(false);

  try {
    // CONVERTIR FECHA A DD/MM/YYYY ANTES DE ENVIAR
    const formattedDate = formatDateToDDMMYYYY(selectedDate);
    console.log('📅 Fecha convertida para enviar:', selectedDate, '->', formattedDate);

    const appointmentData = {
      clientName: user.firstName || user.name || user.username || 'Cliente',
      email: user.email || '',
      phone: user.phone || '',
      date: formattedDate, // USAR LA FECHA CONVERTIDA
      time: selectedTime,
      services: selectedServices,
      total: total,
      duration: totalDuration,
      paymentMethod: paymentMethod,
      notes: notes,
      barber: selectedBarber, // Incluir información del peluquero
      barberId: selectedBarber?.id, // Incluir ID del peluquero
      confirmationNumber: 'CONF-' + Date.now().toString().slice(-6)
    };

    console.log('📝 Enviando datos del turno:', appointmentData);
    
    // Usar la nueva función con notificaciones automáticas
    const newAppointment = await createAppointmentWithNotifications(appointmentData);

    console.log('✅ Turno creado exitosamente:', newAppointment);
    
    // Llamar al callback del padre
    if (onAppointmentCreated) {
      console.log('🔄 Llamando a onAppointmentCreated');
      onAppointmentCreated(newAppointment);
    } else {
      console.error('❌ onAppointmentCreated no está definido');
      setError('Error: No se pudo procesar la confirmación del turno');
    }

  } catch (err) {
    console.error('❌ Error detallado al agendar turno:', err);
    setError('Error al agendar el turno: ' + (err.message || 'Error desconocido'));
  } finally {
    setLoading(false);
  }
};
  const getServiceIcon = (serviceName) => {
    const icons = {
      'Corte': 'scissors',
      'Corte + Barba': 'user',
      'Claritos/Reflejos (incluye corte)': 'star',
      'Global (incluye corte)': 'palette'
    };
    return <i className={`fa-solid fa-${icons[serviceName] || 'scissors'}`}></i>;
  };

  const getPaymentIcon = (method) => {
    return method === 'Efectivo' ?
      <i className="fa-solid fa-money-bill-wave me-2"></i> :
      <i className="fa-solid fa-building-columns me-2"></i>;
  };

  // Formatear precio con separadores de miles
  const formatPrice = (price) => {
    return `$${price.toLocaleString('es-AR')}`;
  };

  return (
    <Card className="services-payment-card">
      <Card.Header>
        <h5><i className="fa-solid fa-scissors"></i> Servicios y Pago</h5>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            <i className="fa-solid fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {/* MOSTRAR MENSAJE SI NO HAY PELUQUERO SELECCIONADO */}
        {!selectedBarber && (
          <Alert variant="warning" className="mb-4">
            <i className="fa-solid fa-user-slash me-2"></i>
            Primero selecciona un peluquero en el calendario
          </Alert>
        )}

        {/* MOSTRAR MENSAJE SI YA TIENE TURNO EXISTENTE */}
        {existingAppointment && (
          <Alert variant="warning" className="mb-4">
            <h6><i className="fa-solid fa-info-circle me-2"></i>Ya tienes un turno agendado</h6>
            <p className="mb-2">
              <strong>Fecha:</strong> {new Date(existingAppointment.date).toLocaleDateString('es-ES')}
            </p>
            <p className="mb-2">
              <strong>Hora:</strong> {existingAppointment.time}
            </p>
            {existingAppointment.barber && (
              <p className="mb-2">
                <strong>Peluquero:</strong> {existingAppointment.barber.name}
              </p>
            )}
            <p className="mb-0">
              <strong>Servicios:</strong> {existingAppointment.services.map(s => s.name).join(', ')}
            </p>
            <hr />
            <p className="mb-0 small">
              Para modificar o cancelar tu turno existente, usa los botones de arriba.
            </p>
          </Alert>
        )}

        {!selectedDate && !existingAppointment && selectedBarber && (
          <Alert variant="warning">
            <i className="fa-solid fa-clock me-2"></i>
            Primero selecciona una fecha y hora en el calendario
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Servicios como Tarjetas Clickeables */}
          <div className="mb-4">
            <Form.Label className="services-label">
              <i className="fa-solid fa-list me-2"></i>
              Selecciona los servicios:
            </Form.Label>
            <Row className="g-3">
              {services.map(service => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <Col key={service.id} xs={12} className="mb-3">
                    <div
                      className={`service-card ${isSelected ? 'selected' : ''} ${existingAppointment ? 'disabled-service' : ''} ${!selectedBarber ? 'disabled-service' : ''}`}
                      onClick={() => !existingAppointment && selectedBarber && handleServiceToggle(service)}
                    >
                      <div className="service-icon">
                        {getServiceIcon(service.name)}
                      </div>
                      <div className="service-content">
                        <h6 className="service-name">{service.name}</h6>
                        <div className="service-details">
                          <span className="service-price">{formatPrice(service.price)}</span>
                          <span className="service-duration">{service.duration}min</span>
                        </div>
                      </div>
                      {(existingAppointment || !selectedBarber) && (
                        <div className="service-overlay">
                          <i className="fa-solid fa-lock"></i>
                        </div>
                      )}
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>

          {/* Resumen */}
          {selectedServices.length > 0 && (
            <Card className="summary-card mb-4">
              <Card.Header>
                <h6><i className="fa-solid fa-receipt me-2"></i> Resumen del Turno</h6>
              </Card.Header>
              <Card.Body>
                {selectedBarber && (
                  <Alert variant="info" className="mb-3">
                    <div className="d-flex align-items-center">
                      <img 
                        src={selectedBarber.image} 
                        alt={selectedBarber.name}
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          objectFit: 'cover',
                          marginRight: '1rem',
                          border: '2px solid #8a2be2'
                        }}
                      />
                      <div>
                        <strong className="d-block">{selectedBarber.name}</strong>
                        <small className="text-muted">Turnos cada {selectedBarber.interval} minutos</small>
                      </div>
                    </div>
                  </Alert>
                )}
                <ListGroup variant="flush">
                  {selectedServices.map(service => (
                    <ListGroup.Item key={service.id} className="summary-item">
                      <span className="service-summary-name">{service.name}</span>
                      <span className="service-summary-price">{formatPrice(service.price)}</span>
                    </ListGroup.Item>
                  ))}
                  <ListGroup.Item className="summary-total">
                    <span>Total:</span>
                    <span>{formatPrice(total)}</span>
                  </ListGroup.Item>
                  <ListGroup.Item className="summary-duration">
                    <span>Duración aproximada:</span>
                    <span>{totalDuration} minutos</span>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          )}

          {/* Método de pago como Botones */}
          <div className="mb-4">
            <Form.Label className="payment-label">
              <i className="fa-solid fa-credit-card me-2"></i>
              Método de pago:
            </Form.Label>
            <div className="payment-methods">
              {paymentMethods.map(method => (
                <button
                  key={method}
                  type="button"
                  className={`payment-method-btn ${paymentMethod === method ? 'selected' : ''} ${existingAppointment ? 'disabled-payment' : ''} ${!selectedBarber ? 'disabled-payment' : ''}`}
                  onClick={() => !existingAppointment && selectedBarber && setPaymentMethod(method)}
                  disabled={existingAppointment || !selectedBarber}
                >
                  {getPaymentIcon(method)} {method}
                </button>
              ))}
            </div>
          </div>

          {/* Notas adicionales */}
          <Form.Group className="mb-4">
            <Form.Label>
              <i className="fa-solid fa-note-sticky me-2"></i>
              Notas adicionales (opcional):
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => !existingAppointment && selectedBarber && setNotes(e.target.value)}
              placeholder={existingAppointment ? "No puedes agregar notas mientras tengas un turno activo" : !selectedBarber ? "Primero selecciona un peluquero" : "Algún requerimiento especial, color de tintura, estilo de corte preferido, etc."}
              className="notes-textarea"
              disabled={existingAppointment || !selectedBarber}
            />
          </Form.Group>

          {/* Modal de Confirmación Centrado y Mejorado */}
          {showConfirmation && (
            <div className="modal-overlay">
              <div className="confirmation-modal">
                <div className="modal-header">
                  <h5>
                    <i className="fa-solid fa-circle-check me-2 text-success"></i>
                    Revisa tu turno
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowConfirmation(false)}
                    aria-label="Cerrar"
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>

                <div className="modal-content">
                  <div className="confirmation-details">
                    <h6>Revisa los detalles de tu turno</h6>

                    {/* Peluquero */}
                    {selectedBarber && (
                      <div className="detail-section">
                        <div className="detail-section-title">
                          <i className="fa-solid fa-user"></i>
                          Peluquero
                        </div>
                        <div className="detail-content">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <img 
                              src={selectedBarber.image} 
                              alt={selectedBarber.name}
                              style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <strong>{selectedBarber.name}</strong>
                              <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                                Turnos cada {selectedBarber.interval} minutos
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fecha y Hora */}
                    <div className="detail-section">
                      <div className="detail-section-title">
                        <i className="fa-solid fa-calendar-day"></i>
                        Fecha y Hora
                      </div>
                      <div className="detail-content">
                        {(() => {
                          try {
                            // Usar la función formatDateToDDMMYYYY para asegurar formato correcto
                            const displayDate = formatDateToDDMMYYYY(selectedDate);
                            // Convertir a Date para formatear
                            if (displayDate.includes('/')) {
                              const [day, month, year] = displayDate.split('/').map(Number);
                              const date = new Date(year, month - 1, day);
                              return date.toLocaleDateString('es-ES', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }) + ' a las ' + selectedTime;
                            }
                            // Si no se puede parsear, mostrar como texto
                            return displayDate + ' a las ' + selectedTime;
                          } catch (error) {
                            return selectedDate + ' a las ' + selectedTime;
                          }
                        })()}
                      </div>
                    </div>

                    {/* Servicios */}
                    <div className="detail-section">
                      <div className="detail-section-title">
                        <i className="fa-solid fa-scissors"></i>
                        Servicios Seleccionados
                      </div>
                      <div className="detail-content">
                        <div className="services-list-modal">
                          {selectedServices.map(service => (
                            <div key={service.id} className="service-item-modal">
                              <div className="service-info">
                                <div className="service-name-modal">{service.name}</div>
                                <div className="service-duration-modal">
                                  <i className="fa-solid fa-clock"></i>
                                  {service.duration} minutos
                                </div>
                              </div>
                              <div className="service-price-modal">{formatPrice(service.price)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Método de Pago */}
                    <div className="detail-section">
                      <div className="detail-section-title">
                        <i className="fa-solid fa-credit-card"></i>
                        Método de Pago
                      </div>
                      <div className="detail-content">
                        {paymentMethod === 'Efectivo' ?
                          <><i className="fa-solid fa-money-bill-wave me-2"></i> Efectivo</> :
                          <><i className="fa-solid fa-building-columns me-2"></i> Transferencia Bancaria</>
                        }
                      </div>
                    </div>

                    {/* Duración Total */}
                    <div className="detail-section">
                      <div className="detail-section-title">
                        <i className="fa-solid fa-stopwatch"></i>
                        Duración Aprox
                      </div>
                      <div className="detail-content">
                        {totalDuration} minutos
                      </div>
                    </div>

                    {/* Notas */}
                    {notes && (
                      <div className="detail-section notes-section">
                        <div className="detail-section-title">
                          <i className="fa-solid fa-note-sticky"></i>
                          Notas Adicionales
                        </div>
                        <div className="detail-content">
                          "{notes}"
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="detail-section total-section">
                      <div className="detail-section-title">
                        <i className="fa-solid fa-receipt"></i>
                        Total a Pagar
                      </div>
                      <div className="detail-content">
                        {formatPrice(total)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <Button
                    variant="secondary"
                    onClick={() => setShowConfirmation(false)}
                    className="btn-modify"
                  >
                    <i className="fa-solid fa-pen me-2"></i>
                    Modificar
                  </Button>
                  <Button
                    variant="success"
                    onClick={confirmAppointment}
                    disabled={loading}
                    className="btn-confirm"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check me-2"></i>
                        Confirmar Turno
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="success"
            type="submit"
            className="confirm-btn w-100"
            disabled={loading || !selectedDate || !selectedTime || selectedServices.length === 0 || existingAppointment || !selectedBarber}
            size="lg"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Agendando turno...
              </>
            ) : existingAppointment ? (
              <>
                <i className="fa-solid fa-lock me-2"></i>
                Ya tienes un turno
              </>
            ) : !selectedBarber ? (
              <>
                <i className="fa-solid fa-user-slash me-2"></i>
                Selecciona un peluquero
              </>
            ) : (
              <>
                <i className="fa-solid fa-calendar-check me-2"></i>
                Confirmar Turno
              </>
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default AppointmentForm;
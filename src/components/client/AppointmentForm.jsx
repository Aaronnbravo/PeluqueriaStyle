import React, { useState } from 'react';
import { Card, Form, Button, Alert, ListGroup, Row, Col, Modal } from 'react-bootstrap';
import { getServices, getPaymentMethods, createAppointmentWithNotifications, BANK_TRANSFER_INFO } from '../../services/appointments';
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
  const [showTransferInfo, setShowTransferInfo] = useState(false);
  const [appointmentConfirmed, setAppointmentConfirmed] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState(null);

  // Función para convertir fecha a DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';

    if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }

    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  // Calcular total con manejo de servicios "Consultar"
  const calculateTotal = () => {
    let total = 0;
    let hasConsultServices = false;
    
    selectedServices.forEach(service => {
      if (service.price > 0) {
        total += service.price;
      } else {
        hasConsultServices = true;
      }
    });
    
    return { total, hasConsultServices };
  };

  const { total, hasConsultServices } = calculateTotal();
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);

  // Calcular señal (50% de servicios con precio)
  const calculateDeposit = () => {
    const paidServices = selectedServices.filter(service => service.price > 0);
    return Math.round(paidServices.reduce((sum, service) => sum + service.price, 0) * 0.5);
  };

  const depositAmount = calculateDeposit();

  const handleServiceToggle = (service) => {
    setSelectedServices(prev => {
      const isSelected = prev.find(s => s.id === service.id);
      let newSelection;
      
      if (isSelected) {
        newSelection = prev.filter(s => s.id !== service.id);
      } else {
        newSelection = [...prev, service];
      }
      
      if (onServiceSelected) {
        onServiceSelected(newSelection);
      }
      
      return newSelection;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedBarber) {
      setError('Por favor selecciona un peluquero primero');
      return;
    }

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

    const hasProductOnly = selectedServices.length === 1 && 
      selectedServices[0].name.includes('Pomada') && 
      selectedServices[0].duration === 0;

    if (hasProductOnly) {
      if (!window.confirm('Estás seleccionando solo la compra de pomada. ¿Deseas continuar?\n\nNota: Esto no es un turno de servicio.')) {
        return;
      }
    }

    if (hasConsultServices) {
      const consultServices = selectedServices.filter(s => s.price === 0);
      const serviceNames = consultServices.map(s => s.name).join(', ');
      
      if (!window.confirm(`⚠️ SERVICIO CONSULTAR PRECIO ⚠️\n\nLos siguientes servicios requieren consulta de precio:\n\n${serviceNames}\n\n¿Deseas continuar con la reserva?\n\nLos precios se consultarán por WhatsApp antes del turno.`)) {
        return;
      }
    }

    // Mostrar información de transferencia antes de confirmar
    if (depositAmount > 0) {
      setShowTransferInfo(true);
    } else {
      setShowConfirmation(true);
    }

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
  setShowTransferInfo(false);

  try {
    // Asegurar que la fecha esté en formato DD/MM/YYYY
    let formattedDate = formatDateToDDMMYYYY(selectedDate);
    
    console.log('📅 Fecha original:', selectedDate);
    console.log('📅 Fecha formateada:', formattedDate);
    console.log('⏰ Hora:', selectedTime);
    console.log('👤 Cliente:', user?.firstName || user?.name || 'Cliente');

    const servicesWithAdjustedPrice = selectedServices.map(service => ({
      ...service,
      price: service.price === 0 ? 0 : service.price
    }));

    const appointmentData = {
      clientName: user.firstName || user.name || user.username || 'Cliente',
      email: user.email || '',
      phone: user.phone || '',
      date: formattedDate, // DD/MM/YYYY
      time: selectedTime,
      services: servicesWithAdjustedPrice,
      total: total,
      duration: totalDuration,
      paymentMethod: paymentMethod,
      notes: notes,
      barber: selectedBarber,
      barberId: selectedBarber?.id,
      confirmationNumber: 'CONF-' + Date.now().toString().slice(-6)
    };

    if (hasConsultServices) {
      const consultServices = selectedServices.filter(s => s.price === 0);
      const serviceNames = consultServices.map(s => s.name).join(', ');
      
      appointmentData.notes = (notes ? notes + '\n\n' : '') + 
        `SERVICIOS A CONSULTAR PRECIO: ${serviceNames}`;
    }
    
    console.log('📋 Datos del turno a enviar:', {
      clientName: appointmentData.clientName,
      date: appointmentData.date,
      time: appointmentData.time,
      total: appointmentData.total,
      services: appointmentData.services.length
    });
    
    const newAppointment = await createAppointmentWithNotifications(appointmentData);
    
    console.log('✅ Turno creado exitosamente:', newAppointment);
    
    setCreatedAppointment(newAppointment);
    setAppointmentConfirmed(true);

    if (onAppointmentCreated) {
      onAppointmentCreated(newAppointment);
    }

  } catch (err) {
    console.error('❌ Error detallado al agendar turno:', err);
    
    // Mensaje de error más específico
    let errorMessage = 'Error al agendar el turno: ' + (err.message || 'Error desconocido');
    
    if (err.message.includes('Invalid time value') || err.message.includes('fecha')) {
      errorMessage = 'Error con la fecha u hora seleccionada. Por favor, verifica e intenta nuevamente.';
    }
    
    setError(errorMessage);
    
    // Scroll al error
    setTimeout(() => {
      const errorElement = document.querySelector('.alert-danger');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  } finally {
    setLoading(false);
  }
};

  const getServiceIcon = (serviceName) => {
    const icons = {
      'Corte': 'scissors',
      'Barba': 'mustache',
      'Corte + Barba': 'user',
      'Global / Color (Consultar)': 'palette',
      'Nutrición capilar (Consultar)': 'leaf',
      'Pomada (compra)': 'shopping-bag'
    };
    return <i className={`fa-solid fa-${icons[serviceName] || 'scissors'}`}></i>;
  };

  const getPaymentIcon = (method) => {
    return <i className="fa-solid fa-building-columns me-2"></i>;
  };

  // Formatear precio con separadores de miles
  const formatPrice = (price) => {
    if (price === 0) return 'Consultar';
    return `$${price.toLocaleString('es-AR')}`;
  };

  // Formatear precio para mostrar en tarjeta
  const formatPriceForCard = (price) => {
    if (price === 0) return 'Consultar precio';
    return `$${price.toLocaleString('es-AR')}`;
  };

  // Copiar texto al portapapeles
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('¡Copiado al portapapeles!');
    }).catch(err => {
      console.error('Error al copiar: ', err);
    });
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

        {!selectedBarber && (
          <Alert variant="warning" className="mb-4">
            <i className="fa-solid fa-user-slash me-2"></i>
            Primero selecciona un peluquero en el calendario
          </Alert>
        )}

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
                const isConsultService = service.price === 0;
                const isProduct = service.name.includes('Pomada');
                
                return (
                  <Col key={service.id} xs={12} className="mb-3">
                    <div
                      className={`service-card ${isSelected ? 'selected' : ''} ${existingAppointment ? 'disabled-service' : ''} ${!selectedBarber ? 'disabled-service' : ''} ${isConsultService ? 'consult-service' : ''}`}
                      onClick={() => !existingAppointment && selectedBarber && handleServiceToggle(service)}
                    >
                      <div className="service-icon">
                        {getServiceIcon(service.name)}
                      </div>
                      <div className="service-content">
                        <h6 className="service-name">{service.name}</h6>
                        <div className="service-details">
                          <span className={`service-price ${isConsultService ? 'consult-price' : ''}`}>
                            {formatPriceForCard(service.price)}
                          </span>
                          {service.duration > 0 ? (
                            <span className="service-duration">{service.duration}min</span>
                          ) : (
                            <span className="service-duration product-label">Producto</span>
                          )}
                        </div>
                        {isConsultService && (
                          <div className="consult-note">
                            <small>
                              <i className="fa-solid fa-info-circle me-1"></i>
                              El precio se consultará por WhatsApp
                            </small>
                          </div>
                        )}
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
                      <span className="service-summary-name">
                        {service.name}
                        {service.price === 0 && (
                          <small className="consult-badge ms-2">(Consultar)</small>
                        )}
                      </span>
                      <span className="service-summary-price">
                        {formatPrice(service.price)}
                      </span>
                    </ListGroup.Item>
                  ))}
                  {depositAmount > 0 && (
                    <ListGroup.Item className="summary-deposit">
                      <span>Seña requerida (50%):</span>
                      <span className="text-warning fw-bold">
                        ${depositAmount.toLocaleString('es-AR')}
                      </span>
                    </ListGroup.Item>
                  )}
                  <ListGroup.Item className="summary-total">
                    <span>Total:</span>
                    <span>
                      {hasConsultServices && total > 0 ? 
                        `${formatPrice(total)} + servicios a consultar` : 
                        hasConsultServices ? 
                        'Servicios a consultar precio' : 
                        formatPrice(total)
                      }
                    </span>
                  </ListGroup.Item>
                  <ListGroup.Item className="summary-duration">
                    <span>Duración aproximada:</span>
                    <span>{totalDuration} minutos</span>
                  </ListGroup.Item>
                </ListGroup>
                {depositAmount > 0 && (
                  <Alert variant="warning" className="mt-3 mb-0">
                    <i className="fa-solid fa-money-bill-wave me-2"></i>
                    <strong>Seña requerida:</strong> Para confirmar tu turno necesitarás realizar una seña del 50% (${depositAmount.toLocaleString('es-AR')}) mediante transferencia bancaria.
                  </Alert>
                )}
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
            {paymentMethod === 'Transferencia Bancaria' && depositAmount > 0 && (
              <Alert variant="info" className="mt-2">
                <i className="fa-solid fa-info-circle me-2"></i>
                Se te solicitará una seña del 50% mediante transferencia para confirmar el turno.
              </Alert>
            )}
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

          {/* Modal de Información de Transferencia */}
          {showTransferInfo && (
            <div className="modal-overlay">
              <div className="confirmation-modal">
                <div className="modal-header">
                  <h5>
                    <i className="fa-solid fa-money-bill-transfer me-2 text-warning"></i>
                    Información de Transferencia
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowTransferInfo(false)}
                    aria-label="Cerrar"
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>

                <div className="modal-content">
                  <div className="confirmation-details">
                    <Alert variant="warning" className="mb-3">
                      <h6><i className="fa-solid fa-exclamation-triangle me-2"></i>Seña Requerida</h6>
                      <p className="mb-0">
                        Para confirmar tu turno, necesitas realizar una seña del 50% (${depositAmount.toLocaleString('es-AR')}) mediante transferencia bancaria.
                      </p>
                    </Alert>

                    <div className="transfer-info-section">
                      <h6 className="mb-3">
                        <i className="fa-solid fa-building-columns me-2"></i>
                        Datos para la transferencia:
                      </h6>
                      
                      <Card className="transfer-card">
                        <Card.Body>
                          <div className="transfer-detail mb-3">
                            <div className="transfer-label">Alias:</div>
                            <div className="transfer-value d-flex justify-content-between align-items-center">
                              <strong>{BANK_TRANSFER_INFO.alias}</strong>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => copyToClipboard(BANK_TRANSFER_INFO.alias)}
                                title="Copiar alias"
                              >
                                <i className="fa-solid fa-copy"></i>
                              </Button>
                            </div>
                          </div>
                          
                          <div className="transfer-detail mb-3">
                            <div className="transfer-label">Titular:</div>
                            <div className="transfer-value d-flex justify-content-between align-items-center">
                              <strong>{BANK_TRANSFER_INFO.accountHolder}</strong>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => copyToClipboard(BANK_TRANSFER_INFO.accountHolder)}
                                title="Copiar nombre"
                              >
                                <i className="fa-solid fa-copy"></i>
                              </Button>
                            </div>
                          </div>
                          
                          <div className="transfer-detail mb-3">
                            <div className="transfer-label">Entidad:</div>
                            <div className="transfer-value d-flex justify-content-between align-items-center">
                              <strong>{BANK_TRANSFER_INFO.bank}</strong>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => copyToClipboard(BANK_TRANSFER_INFO.bank)}
                                title="Copiar entidad"
                              >
                                <i className="fa-solid fa-copy"></i>
                              </Button>
                            </div>
                          </div>
                          
                          <div className="transfer-detail mb-4">
                            <div className="transfer-label">Monto a transferir:</div>
                            <div className="transfer-value d-flex justify-content-between align-items-center">
                              <strong className="text-warning">${depositAmount.toLocaleString('es-AR')}</strong>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => copyToClipboard(depositAmount.toString())}
                                title="Copiar monto"
                              >
                                <i className="fa-solid fa-copy"></i>
                              </Button>
                            </div>
                          </div>
                          
                          <Alert variant="info" className="mb-0">
                            <i className="fa-solid fa-whatsapp me-2"></i>
                            <strong>Importante:</strong> Una vez realizada la transferencia, envía el comprobante por WhatsApp al <strong>2233540664</strong> para confirmar tu turno.
                          </Alert>
                        </Card.Body>
                      </Card>
                      
                      <div className="mt-4">
                        <Alert variant="success">
                          <h6><i className="fa-solid fa-calendar-check me-2"></i>Estado del Turno</h6>
                          <p className="mb-0">
                            Tu turno quedará en estado <strong>PENDIENTE</strong> hasta que se confirme el pago de la seña. Una vez confirmado, el administrador cambiará el estado a <strong>CONFIRMADO</strong>.
                          </p>
                        </Alert>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <Button
                    variant="secondary"
                    onClick={() => setShowTransferInfo(false)}
                    className="btn-modify"
                  >
                    <i className="fa-solid fa-pen me-2"></i>
                    Modificar
                  </Button>
                  <Button
                    variant="warning"
                    onClick={() => {
                      setShowTransferInfo(false);
                      setShowConfirmation(true);
                    }}
                    className="btn-confirm"
                  >
                    <i className="fa-solid fa-check me-2"></i>
                    Continuar con la Reserva
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Confirmación Final */}
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
                            const displayDate = formatDateToDDMMYYYY(selectedDate);
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
                                <div className="service-name-modal">
                                  {service.name}
                                  {service.price === 0 && (
                                    <small className="consult-badge-modal">(Consultar)</small>
                                  )}
                                </div>
                                <div className="service-duration-modal">
                                  <i className="fa-solid fa-clock"></i>
                                  {service.duration > 0 ? `${service.duration} minutos` : 'Producto'}
                                </div>
                              </div>
                              <div className="service-price-modal">
                                {formatPrice(service.price)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Información de Pago */}
                    <div className="detail-section">
                      <div className="detail-section-title">
                        <i className="fa-solid fa-credit-card"></i>
                        Información de Pago
                      </div>
                      <div className="detail-content">
                        <div className="payment-info">
                          <div className="mb-2">
                            <i className="fa-solid fa-building-columns me-2"></i>
                            <strong>Método:</strong> {paymentMethod}
                          </div>
                          {depositAmount > 0 && (
                            <>
                              <div className="mb-2">
                                <i className="fa-solid fa-money-bill-wave me-2"></i>
                                <strong>Seña requerida:</strong> ${depositAmount.toLocaleString('es-AR')} (50%)
                              </div>
                              <div className="transfer-reminder">
                                <small className="text-muted">
                                  <i className="fa-solid fa-info-circle me-1"></i>
                                  Recuerda realizar la transferencia para confirmar tu turno
                                </small>
                              </div>
                            </>
                          )}
                        </div>
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
                        {hasConsultServices ? (
                          <div>
                            <div className="consult-total-message">
                              <i className="fa-solid fa-info-circle me-2 text-warning"></i>
                              Incluye servicios a consultar precio
                            </div>
                            <div className="total-amount">
                              {total > 0 ? `${formatPrice(total)} + consulta` : 'Precio a consultar'}
                            </div>
                          </div>
                        ) : (
                          <div className="total-amount">{formatPrice(total)}</div>
                        )}
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

          {/* Modal de Turno Confirmado */}
          {appointmentConfirmed && createdAppointment && (
            <div className="modal-overlay">
              <div className="confirmation-modal">
                <div className="modal-header bg-warning">
                  <h5 className="text-white">
                    <i className="fa-solid fa-clock me-2"></i>
                    Turno Agendado - Pendiente de Confirmación
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setAppointmentConfirmed(false)}
                    aria-label="Cerrar"
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>

                <div className="modal-content">
                  <div className="confirmation-details">
                    <Alert variant="success" className="mb-3">
                      <h6><i className="fa-solid fa-check-circle me-2"></i>¡Turno Agendado Exitosamente!</h6>
                      <p className="mb-0">Tu turno ha sido registrado en nuestro sistema.</p>
                    </Alert>

                    <div className="detail-section">
                      <div className="detail-section-title">
                        <i className="fa-solid fa-info-circle text-warning"></i>
                        Estado Actual
                      </div>
                      <div className="detail-content">
                        <div className="status-info">
                          <span className="badge bg-warning">⏳ PENDIENTE</span>
                          <p className="mt-2 mb-0">
                            Tu turno está en estado <strong>PENDIENTE</strong> hasta que se confirme el pago de la seña.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="detail-section">
                      <div className="detail-section-title">
                        <i className="fa-solid fa-money-bill-transfer text-warning"></i>
                        Próximo Paso
                      </div>
                      <div className="detail-content">
                        <Alert variant="warning" className="mb-0">
                          <h6><i className="fa-solid fa-exclamation-triangle me-2"></i>Realizar Transferencia</h6>
                          <p>Para confirmar tu turno, realiza la transferencia de:</p>
                          <div className="text-center my-3">
                            <h3 className="text-danger">${depositAmount.toLocaleString('es-AR')}</h3>
                          </div>
                          <div className="transfer-data">
                            <p><strong>Alias:</strong> {BANK_TRANSFER_INFO.alias}</p>
                            <p><strong>Titular:</strong> {BANK_TRANSFER_INFO.accountHolder}</p>
                            <p><strong>Entidad:</strong> {BANK_TRANSFER_INFO.bank}</p>
                          </div>
                          <hr />
                          <p className="mb-2">
                            <i className="fa-solid fa-whatsapp me-2 text-success"></i>
                            <strong>Envía el comprobante al:</strong> 2233540664
                          </p>
                        </Alert>
                      </div>
                    </div>

                    <div className="detail-section">
                      <div className="detail-section-title">
                        <i className="fa-solid fa-calendar-plus text-warning"></i>
                        Recordatorios de Calendario
                      </div>
                      <div className="detail-content">
                        <p className="mb-3">Agrega un recordatorio a tu calendario:</p>
                        <div className="calendar-buttons">
                          <Button
                            variant="outline-primary"
                            className="me-2 mb-2"
                            onClick={() => window.open(createdAppointment.notifications?.calendarLinks?.google, '_blank')}
                          >
                            <i className="fa-brands fa-google me-2"></i>
                            Google Calendar
                          </Button>
                          <Button
                            variant="outline-secondary"
                            className="mb-2"
                            onClick={() => window.open(createdAppointment.notifications?.calendarLinks?.apple, '_blank')}
                          >
                            <i className="fa-brands fa-apple me-2"></i>
                            Apple Calendar
                          </Button>
                        </div>
                        <small className="text-muted">
                          <i className="fa-solid fa-clock me-1"></i>
                          Recordatorio programado 2 horas antes del turno
                        </small>
                      </div>
                    </div>

                    <div className="detail-section">
                      <div className="detail-section-title">
                        <i className="fa-solid fa-comment text-warning"></i>
                        Comunicación
                      </div>
                      <div className="detail-content">
                        <p>Recibirás un mensaje por WhatsApp cuando:</p>
                        <ul className="mb-0">
                          <li>Tu turno sea confirmado por el administrador</li>
                          
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <Button
                    variant="warning"
                    onClick={() => {
                      setAppointmentConfirmed(false);
                      if (onAppointmentCreated) {
                        onAppointmentCreated(createdAppointment);
                      }
                    }}
                    className="btn-continue"
                  >
                    <i className="fa-solid fa-check me-2"></i>
                    Entendido
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
                Agendar Turno
              </>
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default AppointmentForm;
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './ClientDashboard.css';
import { Container, Card, Button, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { generateCalendarLinks, BANK_TRANSFER_INFO } from '../../services/appointments';

function ConfirmationPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const appointment = location.state?.appointment;
  
  const [calendarLinks, setCalendarLinks] = useState(null);
  const [showTransferInfo, setShowTransferInfo] = useState(false);

  // Si no hay datos de turno, redirigir
  useEffect(() => {
    if (!appointment) {
      navigate('/client');
    } else {
      // Generar enlaces de calendario
      const links = generateCalendarLinks(appointment);
      setCalendarLinks(links);
    }
  }, [appointment, navigate]);

  if (!appointment) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Cargando información del turno...</p>
      </Container>
    );
  }

  // Formatear teléfono
  const formatPhone = (phone) => {
    if (!phone) return 'No proporcionado';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('54')) {
      return `+${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2)}`;
    }
    return phone;
  };

  // Obtener estado del turno
  const getStatusInfo = () => {
    switch (appointment.status) {
      case 'pending':
        return {
          variant: 'warning',
          text: '⏳ PENDIENTE',
          message: 'Esperando confirmación del pago de la seña',
          icon: 'fa-clock'
        };
      case 'confirmed':
        return {
          variant: 'success',
          text: '✅ CONFIRMADO',
          message: 'Turno confirmado y listo para atender',
          icon: 'fa-check-circle'
        };
      case 'in_progress':
        return {
          variant: 'info',
          text: '🔄 EN PROGRESO',
          message: 'Turno en atención actualmente',
          icon: 'fa-spinner'
        };
      case 'completed':
        return {
          variant: 'primary',
          text: '🏁 TERMINADO',
          message: 'Turno finalizado exitosamente',
          icon: 'fa-flag-checkered'
        };
      case 'cancelled':
        return {
          variant: 'danger',
          text: '❌ CANCELADO',
          message: 'Turno cancelado',
          icon: 'fa-times-circle'
        };
      default:
        return {
          variant: 'secondary',
          text: '❓ DESCONOCIDO',
          message: 'Estado no definido',
          icon: 'fa-question-circle'
        };
    }
  };

  const statusInfo = getStatusInfo();
  
  // Calcular señal
  const calculateDeposit = () => {
    const paidServices = appointment.services?.filter(service => service.price > 0) || [];
    return Math.round(paidServices.reduce((sum, service) => sum + service.price, 0) * 0.5);
  };

  const depositAmount = calculateDeposit();

  const handleBackToHome = () => navigate('/');
  const handleNewAppointment = () => navigate('/client');
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('¡Copiado al portapapeles!');
    }).catch(err => {
      console.error('Error al copiar: ', err);
    });
  };

  return (
    <Container className="compact-confirmation">
      <Card className="confirmation-card">
        <Card.Header className={`confirmation-header text-center py-4 text-white bg-${statusInfo.variant}`}>
          <div className="status-icon">
            <i className={`fa-solid ${statusInfo.icon} fa-3x`}></i>
          </div>
          <h4 className="fw-bold mb-2 mt-2">{appointment.status === 'pending' ? '¡Turno Agendado!' : '¡Turno Confirmado!'}</h4>
          <Badge bg="light" text="dark" className="fs-6 mt-2">
            {statusInfo.text}
          </Badge>
          <p className="mb-0 opacity-90 mt-2">{statusInfo.message}</p>
        </Card.Header>
        
        <Card.Body className="p-4">
          {/* Estado del Turno */}
          <Alert variant={statusInfo.variant} className="mb-4">
            <div className="d-flex align-items-center">
              <i className={`fa-solid ${statusInfo.icon} fa-2x me-3`}></i>
              <div>
                <h5 className="mb-1">Estado: {statusInfo.text}</h5>
                <p className="mb-0">
                  {appointment.status === 'pending' 
                    ? 'Tu turno está pendiente de confirmación. Realiza la transferencia para confirmarlo.' 
                    : statusInfo.message}
                </p>
              </div>
            </div>
          </Alert>

          {/* Información del Cliente */}
          <div className="confirmation-section">
            <div className="section-header">
              <h6 className="fw-bold text-dark mb-3">
                <i className="fa-solid fa-user me-2 text-danger"></i>
                Información del Cliente
              </h6>
            </div>
            <Row>
              <Col md={6} className="mb-3">
                <strong className="text-muted small">Nombre:</strong>
                <div className="fw-bold">{user?.firstName || user?.name || appointment.clientName}</div>
              </Col>
              <Col md={6} className="mb-3">
                <strong className="text-muted small">Email:</strong>
                <div>{user?.email || appointment.email}</div>
              </Col>
              <Col md={6}>
                <strong className="text-muted small">Teléfono:</strong>
                <div>{formatPhone(user?.phone || appointment.phone)}</div>
              </Col>
              <Col md={6}>
                <strong className="text-muted small">N° de Confirmación:</strong>
                <div className="text-danger fw-bold">{appointment.confirmationNumber}</div>
              </Col>
            </Row>
          </div>

          {/* Detalles del Turno */}
          <div className="confirmation-section">
            <div className="section-header">
              <h6 className="fw-bold text-dark mb-3">
                <i className="fa-solid fa-calendar-day me-2 text-danger"></i>
                Detalles del Turno
              </h6>
            </div>
            <Row>
              <Col md={6} className="mb-3">
                <strong className="text-muted small">Fecha:</strong>
                <div>
                  {(() => {
                    try {
                      let dateObj;
                      if (typeof appointment.date === 'string') {
                        if (appointment.date.includes('/')) {
                          const [day, month, year] = appointment.date.split('/').map(Number);
                          dateObj = new Date(year, month - 1, day);
                        } else if (appointment.date.includes('-')) {
                          const [year, month, day] = appointment.date.split('-').map(Number);
                          dateObj = new Date(year, month - 1, day);
                        } else {
                          dateObj = new Date(appointment.date);
                        }
                      } else {
                        dateObj = new Date(appointment.date);
                      }
                      
                      return dateObj.toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    } catch (error) {
                      return appointment.date;
                    }
                  })()}
                </div>
              </Col>
              <Col md={6}>
                <strong className="text-muted small">Hora:</strong>
                <div className="fw-bold fs-5">{appointment.time}</div>
              </Col>
            </Row>
          </div>

          {/* Peluquero Seleccionado */}
          {appointment.barber && (
            <div className="confirmation-section">
              <div className="section-header">
                <h6 className="fw-bold text-dark mb-3">
                  <i className="fa-solid fa-user me-2 text-danger"></i>
                  Peluquero
                </h6>
              </div>
              <div className="d-flex align-items-center">
                <img 
                  src={appointment.barber.image} 
                  alt={appointment.barber.name}
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    objectFit: 'cover',
                    marginRight: '1rem',
                    border: '3px solid #8a2be2'
                  }}
                />
                <div>
                  <div className="fw-bold fs-5">{appointment.barber.name}</div>
                  <div className="text-muted small">
                    <i className="fa-solid fa-clock me-1"></i>
                    Turnos cada {appointment.barber.interval} minutos
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Servicios Contratados */}
          <div className="confirmation-section">
            <div className="section-header">
              <h6 className="fw-bold text-dark mb-3">
                <i className="fa-solid fa-scissors me-2 text-danger"></i>
                Servicios
              </h6>
            </div>
            <div className="services-list">
              {appointment.services?.map((service, index) => (
                <div key={index} className="service-confirmation-item p-3 bg-light rounded mb-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="fw-bold">{service.name}</span>
                      <div className="small text-muted">
                        <i className="fa-solid fa-clock me-1"></i>
                        {service.duration || 30} minutos
                      </div>
                    </div>
                    <span className={`fw-bold fs-5 ${service.price === 0 ? 'text-warning' : 'text-danger'}`}>
                      {service.price === 0 ? 'Consultar' : `$${service.price}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de Pago */}
          <div className="confirmation-section">
            <div className="section-header">
              <h6 className="fw-bold text-dark mb-3">
                <i className="fa-solid fa-money-bill-wave me-2 text-danger"></i>
                Resumen de Pago
              </h6>
            </div>
            <Row>
              <Col md={6} className="mb-3">
                <strong className="text-muted small">Método:</strong>
                <div>{appointment.paymentMethod}</div>
              </Col>
              <Col md={6}>
                <strong className="text-muted small">Total:</strong>
                <div className="text-danger fw-bold fs-4">${appointment.total?.toLocaleString('es-AR')}</div>
              </Col>
            </Row>
            {depositAmount > 0 && (
              <Alert variant="warning" className="mt-3">
                <h6 className="fw-bold">
                  <i className="fa-solid fa-money-bill-wave me-2"></i>
                  Seña Requerida: ${depositAmount.toLocaleString('es-AR')} (50%)
                </h6>
                <p className="mb-2">Para confirmar tu turno, realiza la transferencia del 50%.</p>
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={() => setShowTransferInfo(true)}
                  className="mt-1"
                >
                  <i className="fa-solid fa-eye me-2"></i>
                  Ver datos de transferencia
                </Button>
              </Alert>
            )}
          </div>

          {/* Información de Transferencia (Modal) */}
          {showTransferInfo && (
            <div className="modal-overlay">
              <div className="confirmation-modal">
                <div className="modal-header bg-warning">
                  <h5 className="text-white">
                    <i className="fa-solid fa-money-bill-transfer me-2"></i>
                    Datos para Transferencia
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowTransferInfo(false)}
                    aria-label="Cerrar"
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>
                <div className="modal-content">
                  <Alert variant="warning" className="mb-3">
                    <h6><i className="fa-solid fa-exclamation-triangle me-2"></i>Seña Requerida</h6>
                    <p className="mb-0">
                      Para confirmar tu turno, realiza una transferencia de <strong>${depositAmount.toLocaleString('es-AR')}</strong> (50% del total).
                    </p>
                  </Alert>

                  <div className="transfer-info">
                    <div className="transfer-item mb-3">
                      <div className="transfer-label">Alias:</div>
                      <div className="transfer-value d-flex justify-content-between align-items-center">
                        <code className="fs-5">{BANK_TRANSFER_INFO.alias}</code>
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

                    <div className="transfer-item mb-3">
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

                    <div className="transfer-item mb-4">
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

                    <Alert variant="info" className="mb-0">
                      <i className="fa-solid fa-whatsapp me-2 text-success"></i>
                      <strong>Importante:</strong> Una vez realizada la transferencia, envía el comprobante por WhatsApp al <strong>2233540664</strong> para confirmar tu turno.
                    </Alert>
                  </div>
                </div>
                <div className="modal-footer">
                  <Button
                    variant="warning"
                    onClick={() => setShowTransferInfo(false)}
                  >
                    <i className="fa-solid fa-check me-2"></i>
                    Entendido
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Recordatorios de Calendario */}
          {calendarLinks && (
            <div className="confirmation-section">
              <div className="section-header">
                <h6 className="fw-bold text-dark mb-3">
                  <i className="fa-solid fa-calendar-plus me-2 text-danger"></i>
                  Recordatorios
                </h6>
              </div>
              <Alert variant="info">
                <h6 className="fw-bold mb-3">
                  <i className="fa-solid fa-bell me-2"></i>
                  Agregar a tu calendario
                </h6>
                <p className="mb-3">Agrega un recordatorio 2 horas antes de tu turno:</p>
                <div className="calendar-buttons d-flex flex-column flex-md-row gap-2">
                  <Button 
                    variant="primary" 
                    onClick={() => window.open(calendarLinks.google, '_blank')}
                    className="mb-2 mb-md-0"
                  >
                    <i className="fa-brands fa-google me-2"></i>
                    Google Calendar
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => window.open(calendarLinks.apple, '_blank')}
                  >
                    <i className="fa-brands fa-apple me-2"></i>
                    Apple Calendar
                  </Button>
                </div>
                <p className="mt-3 mb-0 small">
                  <i className="fa-solid fa-info-circle me-2"></i>
                  El recordatorio incluirá todos los detalles de tu turno.
                </p>
              </Alert>
            </div>
          )}

          {/* Notificaciones */}
          <Alert variant={appointment.status === 'pending' ? 'warning' : 'success'} className="mt-4">
            <h6 className="fw-bold mb-3">
              <i className="fa-solid fa-bell me-2"></i>
              Notificaciones
            </h6>
            {appointment.status === 'pending' ? (
              <>
                <div className="d-flex align-items-center mb-2">
                  <i className="fa-solid fa-clock text-warning me-3 fa-lg"></i>
                  <div>
                    <strong>Estado actual: Pendiente de confirmación</strong>
                    <div className="small">El administrador confirmará tu turno al recibir el comprobante</div>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <i className="fa-solid fa-whatsapp text-success me-3 fa-lg"></i>
                  <div>
                    <strong>Recibirás notificación por WhatsApp cuando:</strong>
                    <div className="small">• Tu turno sea confirmado</div>
                    <div className="small">• Faltan 2 horas para tu turno</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="d-flex align-items-center mb-2">
                  <i className="fa-solid fa-check-circle text-success me-3 fa-lg"></i>
                  <div>
                    <strong>Turno confirmado por el administrador</strong>
                    <div className="small">Tu pago ha sido verificado y el turno está confirmado</div>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <i className="fa-solid fa-clock text-warning me-3 fa-lg"></i>
                  <div>
                    <strong>Recordatorio programado</strong>
                    <div className="small">Recibirás un recordatorio 2 horas antes</div>
                  </div>
                </div>
              </>
            )}
          </Alert>

          {/* Botones */}
          <div className="confirmation-actions text-center pt-4 mt-3">
            <Button 
              variant="danger" 
              onClick={handleNewAppointment}
              className="me-3 px-4 py-3"
              size="lg"
            >
              <i className="fa-solid fa-calendar-plus me-2"></i>
              Ver estado de turno
            </Button>
            <Button 
              variant="outline-dark" 
              onClick={handleBackToHome}
              className="px-4 py-3"
              size="lg"
            >
              <i className="fa-solid fa-house me-2"></i>
              Volver al Inicio
            </Button>
          </div>
          
          <div className="text-center mt-4 pt-3 border-top">
            <p className="text-muted small">
              <i className="fa-solid fa-info-circle me-2"></i>
              {appointment.status === 'pending' 
                ? 'Si ya realizaste la transferencia, envía el comprobante por WhatsApp para acelerar la confirmación.' 
                : 'Si necesitas modificar o cancelar tu turno, ve a la sección "Mi Turno".'}
            </p>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ConfirmationPage;
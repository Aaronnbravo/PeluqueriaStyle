import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './ClientDashboard.css';
import { Container, Card, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
function ConfirmationPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const appointment = location.state?.appointment;

  // Si no hay datos de turno, redirigir
  useEffect(() => {
    if (!appointment) {
      navigate('/client');
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

  const handleBackToHome = () => navigate('/');
  const handleNewAppointment = () => navigate('/client');

  return (
    <Container className="compact-confirmation">
      <Card className="confirmation-card">
        <Card.Header className="confirmation-header text-center py-4 text-white">
          <div className="success-icon">
            <i className="fa-solid fa-check-circle fa-3x"></i>
          </div>
          <h4 className="fw-bold mb-2 mt-2">¡Turno Confirmado!</h4>
          <p className="mb-0 opacity-90">Tu reserva ha sido agendada exitosamente</p>
        </Card.Header>
        
        <Card.Body className="p-4">
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
        // Intentar parsear la fecha primero
        let dateObj;
        if (typeof appointment.date === 'string') {
          if (appointment.date.includes('/')) {
            // DD/MM/YYYY
            const [day, month, year] = appointment.date.split('/').map(Number);
            dateObj = new Date(year, month - 1, day);
          } else if (appointment.date.includes('-')) {
            // YYYY-MM-DD
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
        console.error('Error formateando fecha:', error);
        return appointment.date; // Mostrar como viene si hay error
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

          {/* Servicios Contratados */}
          <div className="confirmation-section">
            <div className="section-header">
              <h6 className="fw-bold text-dark mb-3">
                <i className="fa-solid fa-scissors me-2 text-danger"></i>
                Servicios
              </h6>
            </div>
            <div className="services-list">
              {appointment.services.map((service, index) => (
                <div key={index} className="service-confirmation-item p-3 bg-light rounded mb-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="fw-bold">{service.name}</span>
                      <div className="small text-muted">
                        <i className="fa-solid fa-clock me-1"></i>
                        {service.duration || 30} minutos
                      </div>
                    </div>
                    <span className="text-danger fw-bold fs-5">${service.price}</span>
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
                <div className="text-danger fw-bold fs-4">${appointment.total}</div>
              </Col>
            </Row>
          </div>

          {/* Notificaciones */}
          <Alert variant="success" className="mt-4">
            <h6 className="fw-bold mb-3">
              <i className="fa-solid fa-bell me-2"></i>
              Notificaciones Enviadas
            </h6>
            <div className="d-flex align-items-center mb-2">
              <i className="fa-solid fa-check-circle text-success me-3 fa-lg"></i>
              <div>
                <strong>WhatsApp al peluquero:</strong>
                <div className="small">El administrador ha sido notificado</div>
              </div>
            </div>
            <div className="d-flex align-items-center">
              <i className="fa-solid fa-clock text-warning me-3 fa-lg"></i>
              <div>
                <strong>Recordatorio programado:</strong>
                <div className="small">Recibirás un recordatorio 2 horas antes</div>
              </div>
            </div>
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
              Agendar Otro Turno
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
              Si necesitas modificar o cancelar tu turno, ve a la sección "Mis Turnos" en tu dashboard.
            </p>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ConfirmationPage;
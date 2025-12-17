import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Badge, Button } from 'react-bootstrap'
import { getAppointments, updateAppointmentStatus, getLocalDateString } from '../../services/appointments'

function CurrentAppointment() {
  const [currentAppointment, setCurrentAppointment] = useState(null)
  const [nextAppointment, setNextAppointment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrentAppointments()
    // Actualizar cada 30 segundos
    const interval = setInterval(loadCurrentAppointments, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadCurrentAppointments = async () => {
    try {
      setLoading(true)
      const allAppointments = await getAppointments()
      const now = new Date()
      
      // Obtener fecha de hoy en formato YYYY-MM-DD
      const today = getLocalDateString(now)
      
      // Filtrar turnos de hoy (excluyendo cancelados)
      const todayAppointments = allAppointments.filter(apt => 
        apt.date === today && 
        apt.status !== 'cancelled'
      )
      
      // Ordenar por hora
      todayAppointments.sort((a, b) => a.time?.localeCompare(b.time) || 0)
      
      console.log(`📅 Turnos de hoy (${today}):`, todayAppointments.length)
      
      // Encontrar turno actual (en progreso)
      const inProgress = todayAppointments.find(apt => apt.status === 'in_progress')
      
      if (inProgress) {
        setCurrentAppointment(inProgress)
        // Encontrar siguiente turno
        const nextIndex = todayAppointments.indexOf(inProgress) + 1
        setNextAppointment(todayAppointments[nextIndex] || null)
      } else {
        // Si no hay en progreso, encontrar el próximo pendiente/confirmado
        const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        
        const upcoming = todayAppointments.find(apt => 
          (apt.status === 'pending' || apt.status === 'confirmed') &&
          (apt.time > nowTime)
        )
        
        setCurrentAppointment(upcoming || null)
        
        if (upcoming) {
          const nextIndex = todayAppointments.indexOf(upcoming) + 1
          setNextAppointment(todayAppointments[nextIndex] || null)
        } else {
          setNextAppointment(null)
        }
      }
    } catch (error) {
      console.error('Error cargando turnos actuales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartAppointment = async (appointmentId) => {
    try {
      await updateAppointmentStatus(appointmentId, 'in_progress')
      await loadCurrentAppointments()
    } catch (error) {
      console.error('Error iniciando turno:', error)
    }
  }

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      await updateAppointmentStatus(appointmentId, 'completed')
      await loadCurrentAppointments()
    } catch (error) {
      console.error('Error completando turno:', error)
    }
  }

  if (loading) {
    return (
      <Card className="mb-4 current-appointment-card">
        <Card.Body className="text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Cargando turnos en vivo...</span>
          </div>
          <p className="mt-2 small mb-0">Cargando turnos en vivo...</p>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card className="mb-4 current-appointment-card">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">
          <i className="fas fa-user-clock me-2"></i>
          Turnos del Día - En Vivo
        </h5>
      </Card.Header>
      <Card.Body>
        {/* Turno Actual */}
        <div className="mb-4">
          <h6 className="text-muted mb-3">
            <i className="fas fa-user-check me-2"></i>
            <strong>EN ATENCIÓN ACTUALMENTE:</strong>
          </h6>
          
          {currentAppointment ? (
            <Card className={`border-${currentAppointment.status === 'in_progress' ? 'info' : 'warning'} shadow-sm`}>
              <Card.Body>
                <Row className="align-items-center">
                  <Col xs={12} md={8}>
                    <div className="d-flex align-items-center">
                      <div className="me-3">
                        <i className="fas fa-user-circle fa-2x text-primary"></i>
                      </div>
                      <div>
                        <h5 className="mb-1">{currentAppointment.clientName}</h5>
                        <div className="mb-2">
                          <Badge bg={
                            currentAppointment.status === 'in_progress' ? 'info' : 
                            currentAppointment.status === 'confirmed' ? 'primary' : 'warning'
                          } className="me-2">
                            {currentAppointment.status === 'in_progress' ? 'EN PROGRESO' : 
                             currentAppointment.status === 'confirmed' ? 'CONFIRMADO' : 'PENDIENTE'}
                          </Badge>
                          <Badge bg="secondary" className="me-2">{currentAppointment.time}</Badge>
                        </div>
                        <p className="mb-1 small">
                          <i className="fas fa-scissors me-1"></i>
                          {currentAppointment.services?.map(s => s.name).join(', ') || 'Sin servicios'}
                        </p>
                        <p className="mb-0 small text-muted">
                          <i className="fas fa-clock me-1"></i>
                          Duración: {currentAppointment.duration} min • 
                          <i className="fas fa-dollar-sign me-1"></i>
                          ${currentAppointment.total}
                        </p>
                      </div>
                    </div>
                  </Col>
                  <Col xs={12} md={4} className="text-end mt-2 mt-md-0">
                    {currentAppointment.status === 'in_progress' ? (
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={() => handleCompleteAppointment(currentAppointment.id)}
                        className="w-100 w-md-auto"
                      >
                        <i className="fas fa-check-circle me-1"></i>
                        Marcar como Terminado
                      </Button>
                    ) : (
                      <Button 
                        variant="info" 
                        size="sm"
                        onClick={() => handleStartAppointment(currentAppointment.id)}
                        className="w-100 w-md-auto"
                      >
                        Iniciar Atención
                      </Button>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ) : (
            <Card className="border-secondary">
              <Card.Body className="text-center text-muted py-4">
                <i className="fas fa-calendar-times fa-2x mb-2"></i>
                <p className="mb-0">No hay turnos programados para ahora</p>
              </Card.Body>
            </Card>
          )}
        </div>

        {/* Próximo Turno */}
        <div>
          <h6 className="text-muted mb-3">
            <i className="fas fa-user-clock me-2"></i>
            <strong>PRÓXIMO TURNO:</strong>
          </h6>
          
          {nextAppointment ? (
            <Card className="border-success shadow-sm">
              <Card.Body>
                <Row className="align-items-center">
                  <Col xs={12} md={8}>
                    <div className="d-flex align-items-center">
                      <div className="me-3">
                        <i className="fas fa-user-clock fa-2x text-success"></i>
                      </div>
                      <div>
                        <h6 className="mb-1">{nextAppointment.clientName}</h6>
                        <div className="mb-2">
                          <Badge bg="success" className="me-2">PRÓXIMO</Badge>
                          <Badge bg="secondary" className="me-2">{nextAppointment.time}</Badge>
                        </div>
                        <p className="mb-0 small text-muted">
                          <i className="fas fa-scissors me-1"></i>
                          {nextAppointment.services?.map(s => s.name).join(', ') || 'Sin servicios'} • 
                          <i className="fas fa-clock me-1"></i>
                          {nextAppointment.duration} min • 
                          <i className="fas fa-dollar-sign me-1"></i>
                          ${nextAppointment.total}
                        </p>
                      </div>
                    </div>
                  </Col>
                  <Col xs={12} md={4} className="text-end mt-2 mt-md-0">
                    <Badge bg="light" text="dark" className="p-2">
                      <i className="fas fa-clock me-1"></i>
                      Esperando turno...
                    </Badge>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ) : (
            <Card className="border-secondary">
              <Card.Body className="text-center text-muted py-4">
                <i className="fas fa-check-circle fa-2x mb-2"></i>
                <p className="mb-0">No hay más turnos programados para hoy</p>
              </Card.Body>
            </Card>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}

export default CurrentAppointment
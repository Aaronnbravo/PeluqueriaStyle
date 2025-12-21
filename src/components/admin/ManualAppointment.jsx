import React, { useState, useEffect } from 'react'
import { Modal, Form, Button, Row, Col, Card, Alert, Badge } from 'react-bootstrap'
import { searchUsers, getServices, createAdminAppointment, getAvailableTimeSlots, getBarbers } from '../../services/appointments'
import { useAuth } from '../../hooks/useAuth'

function ManualAppointment({ show, onHide, selectedDate, selectedTime }) {
  const [step, setStep] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [services, setServices] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' })
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  
  const { getBarberId, getBarberName } = useAuth()
  const currentBarberId = getBarberId()
  const currentBarberName = getBarberName()
  
  const barbers = getBarbers()

  useEffect(() => {
    if (show) {
      loadServices()
      if (selectedDate) {
        const barber = currentBarberId ? { id: currentBarberId, name: currentBarberName } : null
        setSelectedBarber(barber)
        loadAvailableSlots(selectedDate, barber)
      }
    }
  }, [show, selectedDate])

  const loadServices = () => {
    const servicesData = getServices()
    setServices(servicesData || [])
  }

  const loadAvailableSlots = async (date, barber = null) => {
    try {
      const slots = await getAvailableTimeSlots(date, barber, selectedServices)
      setAvailableSlots(Array.isArray(slots) ? slots : [])
      
      if (selectedTime && Array.isArray(slots) && slots.includes(selectedTime)) {
        setSelectedSlot(selectedTime)
      }
    } catch (error) {
      console.error('Error cargando slots:', error)
      setAvailableSlots([])
    }
  }

  const searchUsersHandler = async () => {
    if (searchTerm.length < 2) {
      setUsers([])
      return
    }

    setLoading(true)
    try {
      const foundUsers = await searchUsers(searchTerm)
      const usersWithPhone = Array.isArray(foundUsers) ? foundUsers.map(user => ({
        ...user,
        phone: user.phone || 'Sin teléfono'
      })) : []
      setUsers(usersWithPhone)
    } catch (error) {
      console.error('Error buscando usuarios:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (user) => {
    setSelectedUser({
      ...user,
      phone: user.phone || 'Sin teléfono'
    })
    setStep(2)
  }

  const handleServiceToggle = (service) => {
    const isSelected = selectedServices.find(s => s.id === service.id)
    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id))
    } else {
      setSelectedServices([...selectedServices, service])
    }
    
    if (selectedDate) {
      loadAvailableSlots(selectedDate, selectedBarber)
    }
  }

  const handleBarberChange = (barber) => {
    setSelectedBarber(barber)
    if (selectedDate) {
      loadAvailableSlots(selectedDate, barber)
    }
  }

  const calculateTotal = () => {
    return selectedServices.reduce((sum, service) => sum + (service.price || 0), 0)
  }

  const calculateDuration = () => {
    return selectedServices.reduce((sum, service) => sum + (service.duration || 0), 0)
  }

  const handleSubmit = async () => {
    if (!selectedUser || selectedServices.length === 0 || !selectedSlot || !selectedDate || !selectedBarber) {
      showAlert('Por favor completa todos los campos', 'danger')
      return
    }

    const appointmentData = {
      clientName: `${selectedUser.firstName} ${selectedUser.lastName}`.trim(),
      phone: (selectedUser.phone && selectedUser.phone !== 'Sin teléfono') 
        ? selectedUser.phone 
        : 'Sin teléfono',
      email: selectedUser.email || '',
      date: selectedDate,
      time: selectedSlot,
      services: selectedServices,
      total: calculateTotal(),
      duration: calculateDuration(),
      paymentMethod: paymentMethod || 'Transferencia Bancaria',
      notes: notes || '',
      userId: selectedUser.id || '',
      barberId: selectedBarber.id || '',
      barberName: selectedBarber.name || 'Sin asignar'
    };

    try {
      await createAdminAppointment(appointmentData)
      showAlert(`✅ Turno agendado exitosamente con ${selectedBarber.name}`, 'success')
      setTimeout(() => {
        resetForm()
        onHide()
      }, 2000)
    } catch (error) {
      console.error('❌ Error al agendar:', error)
      showAlert(`❌ Error al agendar el turno: ${error.message}`, 'danger')
    }
  }

  const resetForm = () => {
    setStep(1)
    setSearchTerm('')
    setUsers([])
    setSelectedUser(null)
    setSelectedServices([])
    setSelectedSlot('')
    setNotes('')
    setSelectedBarber(currentBarberId ? { id: currentBarberId, name: currentBarberName } : null)
    setPaymentMethod('Efectivo')
    setAlert({ show: false, message: '', variant: '' })
  }

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant })
  }

  const handleClose = () => {
    resetForm()
    onHide()
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-calendar-plus me-2"></i>
          Agendar Turno Manual
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {alert.show && (
          <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false, message: '', variant: '' })}>
            {alert.message}
          </Alert>
        )}

        {step === 1 && (
          <div>
            <Form.Group className="mb-3">
              <Form.Label><strong>Buscar por nombre de usuario o documento</strong></Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder="Ej: juanperez, 40123456"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter') {
                      searchUsersHandler()
                    }
                  }}
                />
                <Button 
                  variant="danger" 
                  onClick={searchUsersHandler} 
                  disabled={loading || searchTerm.length < 2}
                  className="search-btn"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Buscando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-search me-2"></i>
                      Buscar
                    </>
                  )}
                </Button>
              </div>
            </Form.Group>

            {users.length > 0 && (
              <div>
                <h6>Clientes encontrados:</h6>
                <div className="user-results">
                  {users.map(user => (
                    <Card key={user.id} className="mb-2 user-card" onClick={() => handleUserSelect(user)}>
                      <Card.Body className="py-2">
                        <Row className="align-items-center">
                          <Col>
                            <div className="d-flex align-items-center">
                              <div className="user-avatar me-3">
                                <i className="fas fa-user-circle fa-2x text-primary"></i>
                              </div>
                              <div>
                                <strong>{user.firstName} {user.lastName}</strong>
                                <br />
                                <small className="text-muted">
                                  <i className="fas fa-user me-1"></i> <strong>Usuario:</strong> {user.username} • 
                                  <i className="fas fa-id-card me-1"></i> <strong>Documento:</strong> {user.document}
                                  {user.phone && user.phone !== 'Sin teléfono' && (
                                    <>
                                      • <i className="fas fa-phone me-1"></i> {user.phone}
                                    </>
                                  )}
                                </small>
                              </div>
                            </div>
                          </Col>
                          <Col xs="auto">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              className="seleccionar-btn"
                            >
                              Seleccionar <i className="fas fa-chevron-right ms-1"></i>
                            </Button>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {searchTerm.length >= 2 && users.length === 0 && !loading && (
              <div className="text-center text-muted py-3">
                <i className="fas fa-search fa-2x mb-2"></i>
                <p>No se encontraron clientes con ese nombre de usuario o documento</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && selectedUser && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5>Servicios y Horario</h5>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => setStep(1)}
                className="volver-btn"
              >
                <i className="fas fa-arrow-left me-1"></i> Volver a buscar
              </Button>
            </div>

            <Card className="mb-3 selected-user-card">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="user-avatar me-3">
                    <i className="fas fa-user-check fa-2x text-success"></i>
                  </div>
                  <div>
                    <h6 className="mb-1">Cliente seleccionado:</h6>
                    <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
                    <br />
                    <small className="text-muted">
                      <i className="fas fa-user me-1"></i> {selectedUser.username} • 
                      <i className="fas fa-id-card me-1"></i> {selectedUser.document}
                      {selectedUser.phone && selectedUser.phone !== 'Sin teléfono' && (
                        <>
                          • <i className="fas fa-phone me-1"></i> {selectedUser.phone}
                        </>
                      )}
                      {selectedUser.email && (
                        <>
                          • <i className="fas fa-envelope me-1"></i> {selectedUser.email}
                        </>
                      )}
                    </small>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* BOTONES DE PELUQUERO - CON CLASES CSS */}
            <Form.Group className="mb-4">
              <Form.Label className="h6">Seleccionar Peluquero</Form.Label>
              <div className="d-flex gap-3">
                {barbers.map(barber => {
                  const isSelected = selectedBarber?.id === barber.id;
                  return (
                    <Button
                      key={barber.id}
                      variant={isSelected ? "primary" : "outline-secondary"}
                      onClick={() => handleBarberChange(barber)}
                      className={`peluquero-btn ${isSelected ? 'active' : ''}`}
                    >
                      {barber.name}
                      <br />
                      <small>{barber.description}</small>
                    </Button>
                  );
                })}
              </div>
              {selectedBarber && (
                <div className="mt-2">
                  <Badge bg="info">
                    Intervalo: {selectedBarber.interval} minutos
                  </Badge>
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="h6">Seleccionar Servicios</Form.Label>
              <Row>
                {services.map(service => (
                  <Col xs={12} key={service.id} className="mb-2">
                    <Card 
                      className={`service-select-card ${selectedServices.find(s => s.id === service.id) ? 'selected' : ''}`}
                      onClick={() => handleServiceToggle(service)}
                    >
                      <Card.Body className="py-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong className="d-block fs-6">{service.name}</strong>
                                <small className="text-muted">
                                  <i className="fas fa-clock me-1"></i> {service.duration} minutos • 
                                  <i className="fas fa-dollar-sign ms-2 me-1"></i> ${service.price.toLocaleString('es-AR')}
                                </small>
                              </div>
                              <div className="service-price-badge">
                                <Badge bg="primary" className="fs-6 px-3 py-2">
                                  ${service.price.toLocaleString('es-AR')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="service-check ms-3">
                            {selectedServices.find(s => s.id === service.id) ? (
                              <i className="fas fa-check-circle text-success fa-2x"></i>
                            ) : (
                              <i className="fas fa-circle text-muted fa-2x"></i>
                            )}
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Form.Group>

            {selectedServices.length > 0 && (
              <Card className="mb-3 summary-card">
                <Card.Header className="bg-light">
                  <strong><i className="fas fa-clipboard-list me-2"></i>Resumen del Turno</strong>
                </Card.Header>
                <Card.Body>
                  <Row className="align-items-center">
                    <Col md={7}>
                      <strong>Servicios seleccionados:</strong>
                      <ul className="mb-0 mt-2">
                        {selectedServices.map(service => (
                          <li key={service.id} className="d-flex justify-content-between">
                            <span>{service.name}</span>
                            <span className="fw-bold">${service.price.toLocaleString('es-AR')}</span>
                          </li>
                        ))}
                      </ul>
                    </Col>
                    <Col md={5}>
                      <div className="text-end">
                        <div className="mb-2">
                          <strong>Duración total:</strong> 
                          <Badge bg="info" className="ms-2 fs-6">
                            {calculateDuration()} minutos
                          </Badge>
                        </div>
                        <div>
                          <strong>Total:</strong>
                          <Badge bg="success" className="ms-2 fs-5">
                            ${calculateTotal().toLocaleString('es-AR')}
                          </Badge>
                        </div>
                        <small className="text-muted d-block mt-2">
                          <i className="fas fa-user-tie me-1"></i>
                          Peluquero: {selectedBarber?.name || 'No seleccionado'}
                        </small>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            <Form.Group className="mb-3">
              <Form.Label className="h6">Seleccionar Horario</Form.Label>
              <Form.Select 
                value={selectedSlot} 
                onChange={(e) => setSelectedSlot(e.target.value)}
                disabled={!selectedDate || !selectedBarber || availableSlots.length === 0}
                className="time-select"
              >
                <option value="">Selecciona un horario disponible</option>
                {availableSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </Form.Select>
              {!selectedDate && (
                <Form.Text className="text-muted">
                  Primero selecciona una fecha en el calendario
                </Form.Text>
              )}
              {!selectedBarber && (
                <Form.Text className="text-muted">
                  Primero selecciona un peluquero
                </Form.Text>
              )}
              {selectedDate && selectedBarber && availableSlots.length === 0 && (
                <Form.Text className="text-danger">
                  No hay horarios disponibles para esta fecha con {selectedBarber.name}
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="h6">Método de Pago</Form.Label>
              <Form.Select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Transferencia Bancaria">Transferencia Bancaria</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="h6">Notas adicionales (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Notas especiales para este turno..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Form.Group>

            <div className="text-center">
              <Button 
                variant="danger" 
                size="lg"
                onClick={handleSubmit}
                disabled={selectedServices.length === 0 || !selectedSlot || !selectedBarber}
                className="confirm-btn"
              >
                <i className="fas fa-calendar-check me-2"></i>
                Confirmar Turno con {selectedBarber?.name} - ${calculateTotal().toLocaleString('es-AR')}
              </Button>
              <small className="d-block mt-2 text-muted">
                Método de pago: {paymentMethod}
              </small>
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  )
}

export default ManualAppointment
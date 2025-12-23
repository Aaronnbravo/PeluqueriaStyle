import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, Alert, Modal, Row, Col } from 'react-bootstrap';
import { getAppointments, updateAppointmentStatus, deleteAppointment } from '../../services/appointments';

function AppointmentManager() {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsAppointment, setDetailsAppointment] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' o 'desc'

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const allAppointments = await getAppointments();
      console.log('📊 Todos los turnos cargados:', allAppointments.length);
      
      // Ordenar por fecha (más reciente primero por defecto)
      const sortedAppointments = allAppointments.sort((a, b) => {
        // Crear objetos Date para comparación
        const dateA = parseDateForSorting(a.date);
        const dateB = parseDateForSorting(b.date);
        
        if (sortOrder === 'desc') {
          return dateB - dateA; // Más reciente primero
        } else {
          return dateA - dateB; // Más antiguo primero
        }
      });
      
      setAppointments(sortedAppointments);
      setFilteredAppointments(sortedAppointments);
    } catch (error) {
      console.error('Error cargando turnos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para parsear fechas para ordenamiento
  const parseDateForSorting = (dateStr) => {
    if (!dateStr) return new Date(0);
    
    try {
      // Si es YYYY-MM-DD
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      
      // Si es DD/MM/YYYY
      if (typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      
      // Si ya es un objeto Date
      if (dateStr instanceof Date) {
        return dateStr;
      }
      
      // Intentar parsear como fecha en cualquier formato
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
      
      return new Date(0);
    } catch (error) {
      console.error('Error parseando fecha:', error, dateStr);
      return new Date(0);
    }
  };

  useEffect(() => {
    filterAppointments();
  }, [searchTerm, statusFilter, dateFilter, appointments, sortOrder]);

  const filterAppointments = () => {
    let filtered = [...appointments];

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.clientName?.toLowerCase().includes(term) ||
        apt.phone?.includes(term) ||
        apt.email?.toLowerCase().includes(term)
      );
    }

    // Filtrar por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Filtrar por fecha
    if (dateFilter) {
      const filterDate = dateFormatForComparison(dateFilter);
      filtered = filtered.filter(apt => {
        const aptDate = dateFormatForComparison(apt.date);
        return aptDate === filterDate;
      });
    }

    // Ordenar según la preferencia actual
    filtered.sort((a, b) => {
      const dateA = parseDateForSorting(a.date);
      const dateB = parseDateForSorting(b.date);
      
      // Si las fechas son iguales, ordenar por hora
      if (dateA.getTime() === dateB.getTime()) {
        return a.time?.localeCompare(b.time) || 0;
      }
      
      if (sortOrder === 'desc') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

    setFilteredAppointments(filtered);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const dateFormatForComparison = (dateStr) => {
    if (!dateStr) return '';
    
    // Si ya es YYYY-MM-DD
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Si es DD/MM/YYYY
    if (typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return dateStr;
  };

  const getBarberDisplay = (appointment) => {
    if (appointment.barberName) {
      return `Con: ${appointment.barberName}`;
    }
    
    if (appointment.barber && appointment.barber.name) {
      return `Con: ${appointment.barber.name}`;
    }
    
    if (appointment.barberId) {
      const barberName = appointment.barberId === 'mili' ? 'Mili' : 
                        appointment.barberId === 'santi' ? 'Santiago' : 
                        appointment.barberId;
      return `Con: ${barberName}`;
    }
    
    return 'Sin asignar';
  };

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

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const success = await updateAppointmentStatus(appointmentId, newStatus);
      if (success) {
        loadAppointments();
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const handleCancelClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    try {
      const success = await updateAppointmentStatus(selectedAppointment.id, 'cancelled');
      if (success) {
        setShowCancelModal(false);
        setCancelReason('');
        loadAppointments();
      }
    } catch (error) {
      console.error('Error cancelando turno:', error);
    }
  };

  const handleViewDetails = (appointment) => {
    setDetailsAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleDeleteClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const success = await deleteAppointment(selectedAppointment.id);
      if (success) {
        setShowDeleteModal(false);
        loadAppointments();
      }
    } catch (error) {
      console.error('Error eliminando turno:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Si es DD/MM/YYYY, convertir a Date
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
      
      // Si es YYYY-MM-DD
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
      
      return dateString;
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return dateString;
    }
  };

  // Función para formatear fecha corta (solo día/mes)
  const formatDateShort = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = parseDateForSorting(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div>
      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5><i className="fas fa-calendar-alt"></i> Gestión de Turnos</h5>
            <div className="d-flex align-items-center gap-2">
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={toggleSortOrder}
                title={`Ordenar por fecha ${sortOrder === 'desc' ? '(Más antiguos primero)' : '(Más recientes primero)'}`}
              >
                <i className={`fas fa-sort-amount-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>
                {sortOrder === 'desc' ? ' Recientes primero' : ' Antiguos primero'}
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {/* Filtros */}
          <Row className="mb-4">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Buscar</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nombre, teléfono o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Estado</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="completed">Terminado</option>
                  <option value="cancelled">Cancelado</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Fecha</Form.Label>
                <Form.Control
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button
                variant="outline-primary"
                onClick={loadAppointments}
                title="Actualizar"
                className="w-100"
              >
                <i className="fas fa-sync-alt"></i> Actualizar
              </Button>
            </Col>
          </Row>

          {/* Indicador de ordenamiento */}
          <Alert variant="info" className="mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <i className={`fas fa-sort-amount-${sortOrder === 'desc' ? 'down' : 'up'} me-2`}></i>
                Ordenado por fecha: <strong>{sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}</strong>
              </div>
              <small className="text-muted">
                Mostrando {filteredAppointments.length} de {appointments.length} turnos
              </small>
            </div>
          </Alert>

          {/* Tabla de turnos */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-3">Cargando turnos...</p>
            </div>
          ) : filteredAppointments.length > 0 ? (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>
                      <div className="d-flex align-items-center gap-1">
                        Fecha
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0" 
                          onClick={toggleSortOrder}
                          title="Cambiar orden"
                        >
                          <i className={`fas fa-sort-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>
                        </Button>
                      </div>
                    </th>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Peluquero</th>
                    <th>Servicios</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map(appointment => (
                    <tr key={appointment.id}>
                      <td>
                        <div>
                          <strong>{formatDateShort(appointment.date)}</strong>
                          <br />
                          <small className="text-muted">
                            {formatDate(appointment.date)}
                          </small>
                        </div>
                      </td>
                      <td>
                        <Badge bg="primary">{appointment.time}</Badge>
                      </td>
                      <td>
                        <div>
                          <strong>{appointment.clientName}</strong>
                          <br />
                          <small className="text-muted">
                            <i className="fas fa-phone me-1"></i> {appointment.phone}
                          </small>
                        </div>
                      </td>
                      <td>
                        <Badge bg="info">
                          {getBarberDisplay(appointment)}
                        </Badge>
                      </td>
                      <td>
                        {appointment.services?.map(s => s.name).join(', ')}
                      </td>
                      <td>
                        <Badge bg="success">${appointment.total}</Badge>
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
                            onClick={() => handleViewDetails(appointment)}
                            title="Ver detalles"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleCancelClick(appointment)}
                              title="Cancelar turno"
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          )}
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleDeleteClick(appointment)}
                            title="Eliminar turno"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="info">
              <i className="fas fa-info-circle me-2"></i>
              No se encontraron turnos con los filtros aplicados.
            </Alert>
          )}
        </Card.Body>
        <Card.Footer>
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Mostrando {filteredAppointments.length} de {appointments.length} turnos
            </small>
            <small className="text-muted">
              Orden: {sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}
            </small>
          </div>
        </Card.Footer>
      </Card>

      {/* Modal de cancelación */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Cancelar Turno</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Estás seguro de cancelar el turno de <strong>{selectedAppointment?.clientName}</strong>?</p>
          <Form.Group>
            <Form.Label>Motivo de cancelación (opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Razón de la cancelación..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
            Volver
          </Button>
          <Button variant="danger" onClick={confirmCancel}>
            Confirmar Cancelación
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de detalles */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalles del Turno</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailsAppointment && (
            <div>
              <Row className="mb-3">
                <Col md={8}>
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <i className="fas fa-user-circle fa-2x text-primary"></i>
                    </div>
                    <div>
                      <h5>{detailsAppointment.clientName}</h5>
                      <div>
                        <Badge bg={getStatusVariant(detailsAppointment.status)} className="me-2">
                          {getStatusText(detailsAppointment.status)}
                        </Badge>
                        <Badge bg="info">
                          {getBarberDisplay(detailsAppointment)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col md={4} className="text-end">
                  <Badge bg="primary" className="fs-6 p-2">
                    {detailsAppointment.time}
                  </Badge>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <h6>Información del Cliente</h6>
                  <p><strong>Teléfono:</strong> {detailsAppointment.phone}</p>
                  <p><strong>Email:</strong> {detailsAppointment.email || 'No especificado'}</p>
                  <p><strong>Fecha:</strong> {formatDate(detailsAppointment.date)}</p>
                  <p><strong>Método de pago:</strong> {detailsAppointment.paymentMethod}</p>
                </Col>
                <Col md={6}>
                  <h6>Detalles del Servicio</h6>
                  <ul className="list-group">
                    {detailsAppointment.services?.map(service => (
                      <li key={service.id} className="list-group-item d-flex justify-content-between">
                        <span>{service.name}</span>
                        <span>${service.price}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <h5>Total: <span className="text-success">${detailsAppointment.total}</span></h5>
                  </div>
                </Col>
              </Row>

              {detailsAppointment.notes && (
                <div className="mt-3">
                  <h6>Notas adicionales</h6>
                  <p className="bg-light p-3 rounded">{detailsAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar Turno</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Estás seguro de eliminar permanentemente el turno de <strong>{selectedAppointment?.clientName}</strong>?</p>
          <Alert variant="warning">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Esta acción no se puede deshacer. Se eliminarán todos los datos del turno.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Eliminar Permanentemente
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default AppointmentManager;
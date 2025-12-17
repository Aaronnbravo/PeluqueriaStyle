import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Badge, Alert } from 'react-bootstrap'
import { getAppointments, updateAppointmentStatus, deleteAppointment, formatDateForDisplay } from '../../services/appointments'

function AppointmentManager() {
  const [appointments, setAppointments] = useState([])
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const allAppointments = await getAppointments()
      setAppointments(allAppointments)
    } catch (error) {
      console.error('Error cargando turnos:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const success = await updateAppointmentStatus(appointmentId, newStatus)
      if (success) {
        await loadAppointments()
        showAlert('Estado actualizado correctamente', 'success')
      } else {
        showAlert('Error al actualizar el estado', 'danger')
      }
    } catch (error) {
      console.error('Error cambiando estado:', error)
      showAlert('Error al actualizar el estado', 'danger')
    }
  }

  const handleDelete = async (appointmentId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este turno?')) {
      try {
        const success = await deleteAppointment(appointmentId)
        if (success) {
          await loadAppointments()
          showAlert('Turno eliminado correctamente', 'success')
        } else {
          showAlert('Error al eliminar el turno', 'danger')
        }
      } catch (error) {
        console.error('Error eliminando turno:', error)
        showAlert('Error al eliminar el turno', 'danger')
    }
    }
  }

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant })
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 3000)
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case 'confirmed': return 'success'
      case 'pending': return 'warning'
      case 'cancelled': return 'danger'
      case 'completed': return 'info'
      case 'in_progress': return 'primary'
      default: return 'secondary'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmado'
      case 'pending': return 'Pendiente'
      case 'cancelled': return 'Cancelado'
      case 'completed': return 'Terminado'
      case 'in_progress': return 'En Progreso'
      default: return 'Desconocido'
    }
  }

  // Ordenar por fecha (más reciente primero)
  const sortAppointmentsByDate = (a, b) => {
    return new Date(b.date) - new Date(a.date);
  }

  return (
    <div>
      {alert.show && (
        <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false, message: '', variant: '' })}>
          {alert.message}
        </Alert>
      )}

      <Card>
        <Card.Header>
          <h5 className="mb-0"><i className="fas fa-users"></i> Gestión de Todos los Turnos</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-3">Cargando turnos...</p>
            </div>
          ) : appointments.length > 0 ? (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Servicios</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {appointments
                  .sort(sortAppointmentsByDate)
                  .map(appointment => (
                    <tr key={appointment.id}>
                      <td>{formatDateForDisplay(appointment.date)}</td>
                      <td>
                        <Badge bg="secondary">{appointment.time}</Badge>
                      </td>
                      <td>
                        <div>
                          <strong>{appointment.clientName}</strong>
                          {appointment.email && (
                            <div>
                              <small className="text-muted">{appointment.email}</small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{appointment.phone || 'N/A'}</td>
                      <td>
                        {appointment.services?.map(service => service.name).join(', ') || 'Sin servicios'}
                      </td>
                      <td>
                        <Badge bg="success">${appointment.total || 0}</Badge>
                      </td>
                      <td>
                        <Badge bg={getStatusVariant(appointment.status)}>
                          {getStatusText(appointment.status)}
                        </Badge>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          {appointment.status !== 'confirmed' && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                              title="Confirmar"
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                          )}
                          {appointment.status !== 'pending' && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handleStatusChange(appointment.id, 'pending')}
                              title="Marcar como Pendiente"
                            >
                              <i className="fas fa-clock"></i>
                            </Button>
                          )}
                          {appointment.status !== 'in_progress' && appointment.status !== 'completed' && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleStatusChange(appointment.id, 'in_progress')}
                              title="Iniciar Atención"
                            >
                              <i className="fas fa-play"></i>
                            </Button>
                          )}
                          {appointment.status === 'in_progress' && (
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => handleStatusChange(appointment.id, 'completed')}
                              title="Marcar como Terminado"
                            >
                              <i className="fas fa-check-circle"></i>
                            </Button>
                          )}
                          {appointment.status !== 'cancelled' && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                              title="Cancelar"
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          )}
                          <Button
                            variant="outline-dark"
                            size="sm"
                            onClick={() => handleDelete(appointment.id)}
                            title="Eliminar"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-4">
              <h6>No hay turnos registrados</h6>
              <p>Los turnos que agenden los clientes aparecerán aquí</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

export default AppointmentManager
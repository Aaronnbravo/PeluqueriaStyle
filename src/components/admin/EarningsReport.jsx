import React, { useState, useEffect } from 'react'
import { Card, Table, Row, Col, Badge, Alert, Button } from 'react-bootstrap'
import { getAppointments, getAdminStats, formatDateForDisplay } from '../../services/appointments'
import { useAuth } from '../../hooks/useAuth'

function EarningsReport() {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    totalEarnings: 0,
    monthlyEarnings: 0
  })
  const [appointments, setAppointments] = useState([])
  const [weeklyEarnings, setWeeklyEarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const { getBarberId, getBarberName } = useAuth()
  const currentBarberId = getBarberId()
  const currentBarberName = getBarberName()

  useEffect(() => {
    loadData()
    // Recargar datos cada 5 minutos
    const interval = setInterval(loadData, 300000)
    return () => clearInterval(interval)
  }, [currentBarberId])

 const loadData = async () => {
  try {
    setLoading(true)
    setError(null)
    
    console.log('💰 Cargando datos para EarningsReport...')
    console.log(`👤 Peluquero actual: ${currentBarberName} (${currentBarberId})`)
    
    // Obtener estadísticas específicas del peluquero
    const adminStats = await getAdminStats(currentBarberId)
    console.log('📈 Estadísticas obtenidas:', adminStats)
    
    // Obtener turnos solo de este peluquero
    const allAppointments = await getAppointments(currentBarberId)
    console.log(`📅 Turnos obtenidos: ${allAppointments?.length || 0}`)
    
    // **CAMBIAR ESTO: Incluir tanto confirmed como completed**
    const earnedAppointments = allAppointments?.filter(apt => 
      apt.status === 'completed' || apt.status === 'confirmed'
    ) || []
    
    console.log(`✅ Turnos con ganancias (confirmed/completed): ${earnedAppointments.length}`)
    
    // Mostrar detalles de algunos turnos
    earnedAppointments.slice(0, 3).forEach((apt, i) => {
      console.log(`  ${i+1}. ${apt.clientName}: $${apt.total} (${apt.status})`)
    })
    
    setStats(adminStats)
    setAppointments(earnedAppointments) // Usar earnedAppointments en lugar de completed
    
    // Calcular ganancias semanales
    calculateWeeklyEarnings(earnedAppointments)
    
  } catch (error) {
    console.error('❌ Error cargando datos:', error)
    setError(`Error al cargar los datos: ${error.message}`)
    setStats({
      totalAppointments: 0,
      todayAppointments: 0,
      totalEarnings: 0,
      monthlyEarnings: 0
    })
    setAppointments([])
    setWeeklyEarnings([])
  } finally {
    setLoading(false)
  }
}

  const calculateWeeklyEarnings = (completedAppointments) => {
    if (!Array.isArray(completedAppointments) || completedAppointments.length === 0) {
      console.log('📊 No hay turnos completados para calcular ganancias semanales')
      setWeeklyEarnings([])
      return
    }
    
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Lunes
    
    const weeklyData = []
    
    // Calcular para cada día de la semana (Lunes a Sábado)
    for (let i = 0; i < 6; i++) {
      const currentDay = new Date(startOfWeek)
      currentDay.setDate(startOfWeek.getDate() + i)
      const dateString = getLocalDateString(currentDay)
      
      // Filtrar turnos completados de este día específico
      const dayAppointments = completedAppointments.filter(apt => {
        // Asegurar que apt.date existe y está en formato correcto
        if (!apt.date) return false
        
        // Normalizar fecha del turno para comparación
        const aptDateNormalized = getLocalDateString(apt.date)
        return aptDateNormalized === dateString
      })
      
      const dayEarnings = dayAppointments.reduce((sum, apt) => sum + (Number(apt.total) || 0), 0)
      const dayName = currentDay.toLocaleDateString('es-ES', { weekday: 'long' })
      
      weeklyData.push({
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        date: dateString,
        earnings: dayEarnings,
        appointments: dayAppointments.length
      })
    }
    
    console.log('📊 Ganancias semanales calculadas:', weeklyData)
    setWeeklyEarnings(weeklyData)
  }

  // Función auxiliar para getLocalDateString
  const getLocalDateString = (dateInput) => {
    if (!dateInput) return '';
    
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    
    // Verificar que la fecha sea válida
    if (isNaN(date.getTime())) {
      console.error('❌ Fecha inválida en getLocalDateString:', dateInput);
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  // Agrupar ganancias por mes (solo turnos completados)
  const earningsByMonth = appointments.reduce((acc, appointment) => {
    if (!appointment || !appointment.date || !appointment.total) return acc;
    
    try {
      const date = new Date(appointment.date)
      if (isNaN(date.getTime())) return acc;
      
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      })
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          name: monthName,
          earnings: 0,
          appointments: 0
        }
      }
      acc[monthYear].earnings += (Number(appointment.total) || 0)
      acc[monthYear].appointments += 1
      return acc
    } catch (error) {
      console.error('Error procesando fecha:', appointment.date, error)
      return acc
    }
  }, {})

  // Calcular total semanal
  const totalWeekly = weeklyEarnings.reduce((sum, day) => sum + (day.earnings || 0), 0)

  // Formatear fecha para mostrar
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Si ya está en formato DD/MM/YYYY
      if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
      }
      
      // Si está en YYYY-MM-DD
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      // Para cualquier otro formato
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return dateString;
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-3">Cargando reporte de ganancias...</p>
        <small className="text-muted">Peluquero: {currentBarberName}</small>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={loadData}>
          <i className="fas fa-sync-alt me-2"></i>
          Reintentar
        </Button>
      </Alert>
    )
  }

  return (
    <div>
      {/* Información del peluquero */}
      <Alert variant="info" className="mb-4">
        <div className="d-flex align-items-center">
          <i className="fas fa-user-tie fa-2x me-3"></i>
          <div>
            <strong>Reporte de Ganancias - {currentBarberName}</strong>
            <div className="mt-1">
              <small>ID: {currentBarberId} • Solo se muestran turnos completados</small>
            </div>
          </div>
        </div>
      </Alert>

      {/* Tarjetas de estadísticas */}
      <Row className="mb-4">
        <Col md={3} xs={6}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="text-primary">
                <i className="fas fa-calendar-alt"></i> Total Turnos
              </Card.Title>
              <h2 className="text-primary">{stats.totalAppointments || 0}</h2>
              <small className="text-muted">Todos los estados</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} xs={6}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="text-info">
                <i className="fas fa-calendar-day"></i> Turnos Hoy
              </Card.Title>
              <h2 className="text-info">{stats.todayAppointments || 0}</h2>
              <small className="text-muted">Hoy</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} xs={6}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="text-success">
                <i className="fas fa-window-restore"></i> Ganancias Mensuales
              </Card.Title>
              <h2 className="text-success">${(stats.monthlyEarnings || 0).toLocaleString('es-AR')}</h2>
              <small className="text-muted">Este mes</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} xs={6}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="text-danger">
                <i className="fas fa-money-check-dollar"></i> Ganancias Totales
              </Card.Title>
              <h2 className="text-danger">${(stats.totalEarnings || 0).toLocaleString('es-AR')}</h2>
              <small className="text-muted">Historial completo</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Ganancias Semanales */}
      <Card className="mb-4 shadow">
        <Card.Header className="bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-calendar-week"></i> 
              Ganancias de la Semana - {currentBarberName}
            </h5>
            <Button variant="light" size="sm" onClick={loadData}>
              <i className="fas fa-sync-alt"></i>
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col>
              <h6 className="text-muted">
                Total Semanal: 
                <Badge bg="success" className="ms-2 fs-5">
                  ${totalWeekly.toLocaleString('es-AR')}
                </Badge>
              </h6>
            </Col>
            <Col className="text-end">
              <small className="text-muted">
                Semana actual • Solo turnos completados
              </small>
            </Col>
          </Row>
          
          {weeklyEarnings.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Fecha</th>
                  <th>Turnos Completados</th>
                  <th>Ganancias</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {weeklyEarnings.map((day, index) => (
                  <tr key={index}>
                    <td>
                      <strong>{day.day}</strong>
                    </td>
                    <td>
                      {formatDateForDisplay(day.date)}
                    </td>
                    <td>
                      <Badge bg="info" pill>{day.appointments}</Badge>
                    </td>
                    <td>
                      <Badge bg={day.earnings > 0 ? "success" : "secondary"} className="fs-6">
                        ${day.earnings.toLocaleString('es-AR')}
                      </Badge>
                    </td>
                    <td>
                      {day.earnings > 0 ? (
                        <Badge bg="success">
                          <i className="fas fa-check-circle me-1"></i>
                          Con Ingresos
                        </Badge>
                      ) : (
                        <Badge bg="secondary">
                          <i className="fas fa-times-circle me-1"></i>
                          Sin Turnos
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">
              <i className="fas fa-info-circle me-2"></i>
              No hay ganancias registradas esta semana para {currentBarberName}
              <div className="mt-2">
                <small className="text-muted">
                  Los turnos deben estar marcados como "Terminados" para aparecer aquí
                </small>
              </div>
            </Alert>
          )}
        </Card.Body>
        <Card.Footer>
          <small className="text-muted">
            <i className="fas fa-clock me-1"></i>
            Última actualización: {new Date().toLocaleTimeString()}
          </small>
        </Card.Footer>
      </Card>

      {/* Tabla de ganancias por mes */}
      <Card className="shadow">
        <Card.Header className="bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-chart-bar"></i> 
              Ganancias por Mes - {currentBarberName}
            </h5>
            <Badge bg="light" text="dark" pill>
              {Object.keys(earningsByMonth).length} meses
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          {Object.keys(earningsByMonth).length > 0 ? (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Turnos Completados</th>
                    <th>Total Ganado</th>
                    <th>Promedio por Turno</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(earningsByMonth)
                    .sort((a, b) => b[0].localeCompare(a[0])) // Ordenar por fecha descendente
                    .map(([monthKey, data]) => (
                      <tr key={monthKey}>
                        <td>
                          <strong>{data.name}</strong>
                        </td>
                        <td>
                          <Badge bg="primary" pill>{data.appointments}</Badge>
                        </td>
                        <td>
                          <Badge bg="success" className="fs-6">
                            ${data.earnings.toLocaleString('es-AR')}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="info">
                            ${data.appointments > 0 
                              ? Math.round(data.earnings / data.appointments).toLocaleString('es-AR')
                              : '0'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </Table>
              
              {/* Resumen total */}
              <div className="mt-4 p-3 bg-light rounded">
                <h6 className="mb-3">Resumen General</h6>
                <Row>
                  <Col md={4}>
                    <div className="text-center">
                      <h6 className="text-muted">Total de Meses</h6>
                      <h3 className="text-primary">{Object.keys(earningsByMonth).length}</h3>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center">
                      <h6 className="text-muted">Turnos Completados</h6>
                      <h3 className="text-primary">
                        {Object.values(earningsByMonth).reduce((sum, month) => sum + month.appointments, 0)}
                      </h3>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center">
                      <h6 className="text-muted">Ganancias Totales</h6>
                      <h3 className="text-success">
                        ${Object.values(earningsByMonth).reduce((sum, month) => sum + month.earnings, 0).toLocaleString('es-AR')}
                      </h3>
                    </div>
                  </Col>
                </Row>
              </div>
            </>
          ) : (
            <Alert variant="warning">
              <i className="fas fa-exclamation-triangle me-2"></i>
              No hay ganancias registradas por mes para {currentBarberName}
              <div className="mt-2">
                <p className="mb-1"><strong>Posibles causas:</strong></p>
                <ul className="mb-0">
                  <li>No hay turnos marcados como "Terminados"</li>
                  <li>Los turnos no tienen campo "total" definido</li>
                  <li>No hay turnos para este peluquero</li>
                </ul>
              </div>
              <Button variant="outline-primary" size="sm" className="mt-3" onClick={loadData}>
                <i className="fas fa-sync-alt me-1"></i>
                Volver a cargar datos
              </Button>
            </Alert>
          )}
        </Card.Body>
        <Card.Footer>
          <small className="text-muted">
            <i className="fas fa-info-circle me-1"></i>
            Solo se muestran turnos con estado "completado" • 
            <i className="fas fa-user-tie ms-2 me-1"></i>
            Peluquero: {currentBarberName}
          </small>
        </Card.Footer>
      </Card>

      {/* Botón de ayuda */}
      <div className="mt-3 text-center">
        <Button variant="outline-info" size="sm" onClick={() => {
          console.log('🔍 DEBUG - Datos actuales:')
          console.log('📊 Stats:', stats)
          console.log('📅 Appointments:', appointments)
          console.log('📈 Weekly Earnings:', weeklyEarnings)
          console.log('💰 Earnings by Month:', earningsByMonth)
        }}>
          <i className="fas fa-bug me-1"></i>
          Ver Datos en Consola (Debug)
        </Button>
      </div>
    </div>
  )
}

export default EarningsReport
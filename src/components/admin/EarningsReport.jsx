import React, { useState, useEffect } from 'react'
import { Card, Table, Row, Col, Badge } from 'react-bootstrap'
import { getAppointments, getAdminStats, formatDateForDisplay } from '../../services/appointments'
import { useAuth } from '../../hooks/useAuth'

function EarningsReport() {
  const [stats, setStats] = useState({})
  const [appointments, setAppointments] = useState([])
  const [weeklyEarnings, setWeeklyEarnings] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Obtener barberId del usuario actual
  const { getBarberId, getBarberName } = useAuth()
  const currentBarberId = getBarberId()
  const currentBarberName = getBarberName()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Obtener estadísticas solo para este peluquero
      const adminStats = await getAdminStats(currentBarberId)
      // Obtener turnos solo de este peluquero
      const allAppointments = await getAppointments(currentBarberId)
      
      setStats(adminStats)
      setAppointments(allAppointments || [])
      
      // Calcular ganancias semanales específicas del peluquero
      calculateWeeklyEarnings(allAppointments || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
      setStats({})
      setAppointments([])
      setWeeklyEarnings([])
    } finally {
      setLoading(false)
    }
  }

  const calculateWeeklyEarnings = (allAppointments) => {
    if (!Array.isArray(allAppointments)) {
      console.error('allAppointments no es un array:', allAppointments)
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
      
      const dayAppointments = allAppointments.filter(apt => apt.date === dateString)
      const dayEarnings = dayAppointments.reduce((sum, apt) => sum + (apt.total || 0), 0)
      const dayName = currentDay.toLocaleDateString('es-ES', { weekday: 'long' })
      
      weeklyData.push({
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        date: dateString,
        earnings: dayEarnings,
        appointments: dayAppointments.length
      })
    }
    
    setWeeklyEarnings(weeklyData)
  }

  // Función auxiliar para getLocalDateString
  const getLocalDateString = (dateInput) => {
    if (!dateInput) return '';
    
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  // Agrupar ganancias por mes
  const earningsByMonth = appointments.reduce((acc, appointment) => {
    if (!appointment || !appointment.date) return acc;
    
    const date = new Date(appointment.date)
    const monthYear = date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long' 
    })
    if (!acc[monthYear]) {
      acc[monthYear] = 0
    }
    acc[monthYear] += (appointment.total || 0)
    return acc
  }, {})

  // Calcular total semanal
  const totalWeekly = weeklyEarnings.reduce((sum, day) => sum + (day.earnings || 0), 0)

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-3">Cargando reporte de ganancias...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Tarjetas de estadísticas */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title><i className="fas fa-square-poll-vertical"></i> Total Turnos</Card.Title>
              <h2>{stats.totalAppointments || 0}</h2>
              <small className="text-muted">{currentBarberName}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title><i className="fas fa-calendar-days"></i> Turnos Hoy</Card.Title>
              <h2>{stats.todayAppointments || 0}</h2>
              <small className="text-muted">{currentBarberName}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title><i className="fas fa-window-restore"></i> Ganancias Mensuales</Card.Title>
              <h2>${stats.monthlyEarnings || 0}</h2>
              <small className="text-muted">{currentBarberName}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title><i className="fas fa-money-check-dollar"></i> Ganancias Totales</Card.Title>
              <h2>${stats.totalEarnings || 0}</h2>
              <small className="text-muted">{currentBarberName}</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Ganancias Semanales */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-calendar-week"></i> 
            Ganancias de la Semana - {currentBarberName}
          </h5>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col>
              <h6 className="text-muted">Total Semanal: <Badge bg="success">${totalWeekly}</Badge></h6>
            </Col>
          </Row>
          <Table responsive>
            <thead>
              <tr>
                <th>Día</th>
                <th>Fecha</th>
                <th>Turnos</th>
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
                    <Badge bg="info">{day.appointments}</Badge>
                  </td>
                  <td>
                    <Badge bg={day.earnings > 0 ? "success" : "secondary"}>
                      ${day.earnings}
                    </Badge>
                  </td>
                  <td>
                    {day.earnings > 0 ? (
                      <Badge bg="success">Con Ingresos</Badge>
                    ) : (
                      <Badge bg="secondary">Sin Turnos</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Tabla de ganancias por mes */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-window-restore"></i> 
            Ganancias por Mes - {currentBarberName}
          </h5>
        </Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Total Ganado</th>
                <th>Cantidad de Turnos</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(earningsByMonth).map(([month, earnings]) => {
                const monthAppointments = appointments.filter(apt => {
                  if (!apt || !apt.date) return false;
                  const aptDate = new Date(apt.date)
                  const aptMonthYear = aptDate.toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long' 
                  });
                  return aptMonthYear === month;
                });
                return (
                  <tr key={month}>
                    <td>{month}</td>
                    <td>
                      <Badge bg="success">${earnings}</Badge>
                    </td>
                    <td>{monthAppointments.length} turnos</td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  )
}

export default EarningsReport
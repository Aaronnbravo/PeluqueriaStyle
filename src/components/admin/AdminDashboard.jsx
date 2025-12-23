import React, { useState, useEffect, useRef } from 'react'
import { Container, Row, Col, Card } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import AdminCalendar from './AdminCalendar'
import EarningsReport from './EarningsReport'
import AppointmentManager from './AppointmentManager'
import CurrentAppointment from './CurrentAppointment'
import { getAppointments, getLocalDateString } from '../../services/appointments'
import logo from '../../images/Logo.png'
import './AdminDashboard.css'
import { logoutUser } from '../../services/users'
import { useAuth } from '../../hooks/useAuth'

function AdminDashboard() {
  const navigate = useNavigate()
  const { getBarberId, getBarberName } = useAuth()
  const currentBarberId = getBarberId()
  const currentBarberName = getBarberName()
  
  const [activeTab, setActiveTab] = useState('agenda')
  const [stats, setStats] = useState({
    turnosHoy: 0,
    ingresosHoy: 0,
    turnosPendientes: 0,
    turnosConfirmados: 0,
    turnosEnProgreso: 0,
    turnosCompletados: 0,
    turnosCancelados: 0,
    totalTurnos: 0
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [loading, setLoading] = useState(true)

  const appointmentsRef = useRef(null)
  const agendaRef = useRef(null)
  const earningsRef = useRef(null)
  const contentRef = useRef(null)

  // Detectar cambios en el tamaño de la pantalla y scroll
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Cargar estadísticas reales ESPECÍFICAS DEL PELUQUERO
  useEffect(() => {
    loadRealStats()
    // Actualizar estadísticas cada 30 segundos
    const interval = setInterval(loadRealStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadRealStats = async () => {
    try {
      setLoading(true);
      // Obtener solo los turnos del peluquero actual
      const allAppointments = await getAppointments(currentBarberId);
      
      const today = getLocalDateString(new Date());
      const todayAppointments = allAppointments.filter(apt => {
        const aptDate = getLocalDateString(apt.date);
        return aptDate === today;
      });
      
      // Calcular estadísticas solo para este peluquero
      const ingresosHoy = todayAppointments.reduce((sum, apt) => sum + (apt.total || 0), 0);
      const turnosPendientes = allAppointments.filter(apt => apt.status === 'pending').length;
      const turnosConfirmados = allAppointments.filter(apt => apt.status === 'confirmed').length;
      const turnosEnProgreso = allAppointments.filter(apt => apt.status === 'in_progress').length;
      const turnosCompletados = allAppointments.filter(apt => apt.status === 'completed').length;
      const turnosCancelados = allAppointments.filter(apt => apt.status === 'cancelled').length;

      setStats({
        turnosHoy: todayAppointments.length,
        ingresosHoy: ingresosHoy,
        turnosPendientes: turnosPendientes,
        turnosConfirmados: turnosConfirmados,
        turnosEnProgreso: turnosEnProgreso,
        turnosCompletados: turnosCompletados,
        turnosCancelados: turnosCancelados,
        totalTurnos: allAppointments.length
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setStats({
        turnosHoy: 0,
        ingresosHoy: 0,
        turnosPendientes: 0,
        turnosConfirmados: 0,
        turnosEnProgreso: 0,
        turnosCompletados: 0,
        turnosCancelados: 0,
        totalTurnos: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para hacer scroll a una sección
  const scrollToSection = (section, tab) => {
    setActiveTab(tab);
    
    setTimeout(() => {
      let targetRef = null;
      
      switch(section) {
        case 'agenda':
          targetRef = agendaRef.current;
          break;
        case 'appointments':
          targetRef = appointmentsRef.current;
          break;
        case 'earnings':
          targetRef = earningsRef.current;
          break;
        default:
          targetRef = contentRef.current;
      }
      
      if (targetRef) {
        targetRef.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };

  const handleTabChange = (tab) => {
    scrollToSection(tab, tab);
  };

  const handleTurnosHoyClick = () => {
    scrollToSection('agenda', 'agenda');
  };

  const handleEarningsClick = () => {
    scrollToSection('earnings', 'earnings');
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleLogout = async () => {
    try {
      // 1. Cerrar sesión en Firebase
      await logoutUser();
      
      // 2. Limpiar localStorage
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      
      // 3. Limpiar sessionStorage
      sessionStorage.clear();
      
      // 4. Redirigir a la página principal
      navigate('/', { replace: true });
      
      // 5. Recargar la página para limpiar estado
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Si hay error, redirigir de todos modos
      navigate('/', { replace: true });
      window.location.href = '/';
    }
  };

  return (
    <div className="admin-dashboard" ref={contentRef}>
      {/* Navbar Admin Responsive */}
      <nav className="admin-navbar">
        <Container>
          <div className="admin-navbar-content">
            <div className="admin-navbar-brand">
              <img 
                src={logo}
                alt="Piso Style" 
                className="admin-logo"
              />
              {!isMobile && (
                <strong>
                  Panel de {currentBarberName || 'Administración'}
                  {currentBarberName && ' - ' + currentBarberName}
                </strong>
              )}
              {isMobile && (
                <strong>
                  {currentBarberName || 'Admin'}
                </strong>
              )}
            </div>
            
            {/* Navegación responsive */}
            {!isMobile ? (
              <div className="admin-navbar-nav">
                <button 
                  className={`admin-nav-btn ${activeTab === 'agenda' ? 'active' : ''}`}
                  onClick={() => handleTabChange('agenda')}
                >
                  <i className="fas fa-calendar-alt me-1"></i>
                  Agenda
                </button>
                <button 
                  className={`admin-nav-btn ${activeTab === 'appointments' ? 'active' : ''}`}
                  onClick={() => handleTabChange('appointments')}
                >
                  <i className="fas fa-users me-1"></i>
                  Turnos
                </button>
                <button 
                  className={`admin-nav-btn ${activeTab === 'earnings' ? 'active' : ''}`}
                  onClick={() => handleTabChange('earnings')}
                >
                  <i className="fas fa-chart-line me-1"></i>
                  Ganancias
                </button>
                <button 
                  className="logout-btn"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt"></i>
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="mobile-nav">
                <button 
                  className={`mobile-nav-btn ${activeTab === 'agenda' ? 'active' : ''}`}
                  onClick={() => handleTabChange('agenda')}
                >
                  <i className="fas fa-calendar-alt"></i>
                  <small>Agenda</small>
                </button>
                <button 
                  className={`mobile-nav-btn ${activeTab === 'appointments' ? 'active' : ''}`}
                  onClick={() => handleTabChange('appointments')}
                >
                  <i className="fas fa-users"></i>
                  <small>Turnos</small>
                </button>
                <button 
                  className={`mobile-nav-btn ${activeTab === 'earnings' ? 'active' : ''}`}
                  onClick={() => handleTabChange('earnings')}
                >
                  <i className="fas fa-chart-line"></i>
                  <small>Ganancias</small>
                </button>
                <button 
                  className="mobile-logout-btn"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt"></i>
                  <small>Salir</small>
                </button>
              </div>
            )}
          </div>
        </Container>
      </nav>

      {/* Contenido */}
      <Container className="admin-content">
        <Row>
          <Col>
            {/* Header con estadísticas - Responsive */}
            <div className="admin-header">
              <h1 className={isMobile ? "h4" : ""}>
                {isMobile ? "Bienvenido" : `Bienvenido, ${currentBarberName || 'Administrador'}`}
              </h1>
              <p className={isMobile ? "small" : ""}>
                {isMobile ? "Panel de control" : `Gestiona tus turnos desde el panel de control${currentBarberName ? ` - ${currentBarberName}` : ''}`}
              </p>
              
              {loading ? (
                <Row className="admin-stats-row">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Col xs={4} md={2} key={i} className="mb-3">
                      <Card className="admin-stat-card h-100">
                        <Card.Body className="text-center p-2 p-md-3">
                          <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                          <p className="mt-2 small mb-0">Cargando...</p>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Row className="admin-stats-row">
                  {/* Turnos Totales */}
                  <Col xs={6} md={2} className="mb-3">
                    <Card 
                      className="admin-stat-card h-100 clickable" 
                      onClick={() => handleTabChange('appointments')}
                    >
                      <Card.Body className="text-center p-2 p-md-3">
                        <div className="admin-stat-icon">
                          <i className="fas fa-calendar-alt"></i>
                        </div>
                        <h5 className={isMobile ? "h6 mb-1" : "h4 mb-2"}>{stats.totalTurnos}</h5>
                        <p className={isMobile ? "small mb-0" : "mb-0"}>Turnos Totales</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  {/* Turnos Hoy */}
                  <Col xs={6} md={2} className="mb-3">
                    <Card 
                      className="admin-stat-card h-100 clickable" 
                      onClick={handleTurnosHoyClick}
                    >
                      <Card.Body className="text-center p-2 p-md-3">
                        <div className="admin-stat-icon">
                          <i className="fas fa-calendar-day"></i>
                        </div>
                        <h5 className={isMobile ? "h6 mb-1" : "h4 mb-2"}>{stats.turnosHoy}</h5>
                        <p className={isMobile ? "small mb-0" : "mb-0"}>Turnos Hoy</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  {/* En Progreso */}
                  <Col xs={6} md={2} className="mb-3">
                    <Card 
                      className="admin-stat-card h-100 clickable" 
                      onClick={() => handleTabChange('agenda')}
                    >
                      <Card.Body className="text-center p-2 p-md-3">
                        <div className="admin-stat-icon">
                          <i className="fas fa-spinner"></i>
                        </div>
                        <h5 className={isMobile ? "h6 mb-1" : "h4 mb-2"}>{stats.turnosEnProgreso}</h5>
                        <p className={isMobile ? "small mb-0" : "mb-0"}>En Progreso</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  {/* Pendientes */}
                  <Col xs={6} md={2} className="mb-3">
                    <Card 
                      className="admin-stat-card h-100 clickable" 
                      onClick={() => handleTabChange('appointments')}
                    >
                      <Card.Body className="text-center p-2 p-md-3">
                        <div className="admin-stat-icon">
                          <i className="fas fa-user-clock"></i>
                        </div>
                        <h5 className={isMobile ? "h6 mb-1" : "h4 mb-2"}>{stats.turnosPendientes}</h5>
                        <p className={isMobile ? "small mb-0" : "mb-0"}>Pendientes</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  {/* Ingresos Día */}
                  <Col xs={6} md={2} className="mb-3">
                    <Card 
                      className="admin-stat-card h-100 clickable" 
                      onClick={handleEarningsClick}
                    >
                      <Card.Body className="text-center p-2 p-md-3">
                        <div className="admin-stat-icon">
                          <i className="fas fa-dollar-sign"></i>
                        </div>
                        <h5 className={isMobile ? "h6 mb-1" : "h4 mb-2"}>${stats.ingresosHoy}</h5>
                        <p className={isMobile ? "small mb-0" : "mb-0"}>Ingresos Día</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  {/* Terminados */}
                  <Col xs={6} md={2} className="mb-3">
                    <Card 
                      className="admin-stat-card h-100 clickable" 
                      onClick={() => handleTabChange('appointments')}
                    >
                      <Card.Body className="text-center p-2 p-md-3">
                        <div className="admin-stat-icon">
                          <i className="fas fa-check-circle"></i>
                        </div>
                        <h5 className={isMobile ? "h6 mb-1" : "h4 mb-2"}>{stats.turnosCompletados}</h5>
                        <p className={isMobile ? "small mb-0" : "mb-0"}>Terminados</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </div>

            {/* Panel de Turno Actual y Próximo */}
            <CurrentAppointment />

            {/* Contenido de las pestañas */}
            <div className={`admin-tab-content ${activeTab}-active`}>
              {activeTab === 'agenda' && (
                <div ref={agendaRef}>
                  <AdminCalendar isMobile={isMobile} />
                </div>
              )}
              {activeTab === 'appointments' && (
                <div ref={appointmentsRef}>
                  <AppointmentManager isMobile={isMobile} />
                </div>
              )}
              {activeTab === 'earnings' && (
                <div ref={earningsRef}>
                  <EarningsReport isMobile={isMobile} />
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Container>

      {/* Botón flotante para subir */}
      <button 
        className={`scroll-to-top-btn ${showScrollTop ? 'show' : ''} ${isMobile ? 'mobile' : ''}`}
        onClick={scrollToTop}
        aria-label="Volver arriba"
      >
        <i className="fas fa-chevron-up"></i>
      </button>

      {/* Footer Responsive */}
      <footer className="admin-footer">
        <Container>
          <Row className="align-items-center text-center text-md-start">
            <Col md={6} className="mb-2 mb-md-0">
              <img 
                src={logo}
                alt="Piso Style" 
                className="admin-footer-logo"
                style={{ height: isMobile ? '50px' : '80px' }}
              />
              <p className={`admin-footer-text ${isMobile ? 'small' : ''}`}>
                SINCE 2023 • Tu estilo, nuestra pasión
              </p>
            </Col>
            <Col md={6} className="text-center text-md-end">
              <p className={`admin-footer-copyright ${isMobile ? 'small' : ''}`}>
                © 2023 Piso Style BarberShop. Todos los derechos reservados.
              </p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  )
}

export default AdminDashboard
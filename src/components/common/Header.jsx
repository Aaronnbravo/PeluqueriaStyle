import React from 'react'
import { Navbar, Nav, Container, Button } from 'react-bootstrap'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import logo from '../../images/Logo.png'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // ✅ NUEVO: Ocultar header en admin
  if (location.pathname.startsWith('/admin')) {
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const scrollToSection = (sectionId) => {
    if (window.location.pathname === '/') {
      const element = document.getElementById(sectionId)
      if (element) {
        const offset = 70
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - offset
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    } else {
      navigate('/')
      // Esperar a que la página cargue y luego hacer scroll
      setTimeout(() => {
        const element = document.getElementById(sectionId)
        if (element) {
          const offset = 70
          const elementPosition = element.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - offset
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }, 100)
    }
  }

  return (
    <Navbar bg="dark" variant="dark" expand="lg" fixed="top" className="navbar-custom">
      <Container>
        <Navbar.Brand 
          href="#inicio" 
          onClick={(e) => {
            e.preventDefault()
            if (window.location.pathname !== '/') {
              navigate('/')
            } else {
              scrollToSection('inicio')
            }
          }}
          className="navbar-brand-custom"
        >
           <img 
            src={logo} // ← Usa la variable importada
            alt="Ian Castillo" 
            className="logo-imagen"
            style={{ 
              height: '100px', 
              width: 'auto',
              marginLeft: '40px' // ← Agrega esto

              
            }}
          />
                  </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" className="navbar-toggler-custom" />
        
        <Navbar.Collapse id="basic-navbar-nav" className="navbar-collapse-custom">
          {/* NAVEGACIÓN PRINCIPAL */}
          <Nav className="mx-auto navbar-nav-custom">
            <Nav.Link 
              as="button"
              className="nav-link-custom"
              onClick={() => scrollToSection('inicio')}
            >
              INICIO
            </Nav.Link>
            <Nav.Link 
              as="button"
              className="nav-link-custom"
              onClick={() => scrollToSection('sobre-nosotros')}
            >
              QUIÉNES SOMOS
            </Nav.Link>
            <Nav.Link 
              as="button"
              className="nav-link-custom"
              onClick={() => scrollToSection('servicios')}
            >
              SERVICIOS
            </Nav.Link>
            <Nav.Link 
              as="button"
              className="nav-link-custom"
              onClick={() => scrollToSection('contacto')}
            >
              CONTACTO
            </Nav.Link>
          </Nav>

          {/* ACCIONES DEL USUARIO */}
          <Nav className="navbar-actions-custom">
            {user ? (
              <>
                {/* ELIMINADO: "Hola, {user.name}" y "Dashboard" */}
                <Button 
                  variant="outline-light" 
                  onClick={handleLogout}
                  className="logout-btn"
                >
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <div className="navbar-social">
                  <a href="https://www.instagram.com/ian.castilloo/" className="social-icon" target='_blank'>
                    <i className="fab fa-instagram"></i>
                  </a>
                 
                </div>
                
                <Button 
                  className="btn-reservar-turno"
                  onClick={() => navigate('/login')}
                >
                  RESERVAR TURNO
                </Button>
                
                
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default Header
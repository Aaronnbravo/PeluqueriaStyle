import React from 'react'
import { Navbar, Nav, Container, Button } from 'react-bootstrap'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import logo from '../../images/Logo.png'
import '../../App.css'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Ocultar header en admin
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
    <Navbar expand="lg" fixed="top" className="navbar">
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
          className="navbar-brand"
        >
          <img
            src={logo}
            alt="Piso Style Logo"
            className="logo-imagen"
          />
        </Navbar.Brand>

        <Navbar.Toggle
          aria-controls="basic-navbar-nav"
          className="navbar-toggler"
        />

        <Navbar.Collapse
          id="basic-navbar-nav"
          className="navbar-collapse"
        >
          {/* NAVEGACIÓN PRINCIPAL */}
          <Nav className="mx-auto navbar-nav">
            <Nav.Link
              as="button"
              className="nav-link"
              onClick={() => scrollToSection('inicio')}
            >
              INICIO
            </Nav.Link>
            <Nav.Link
              as="button"
              className="nav-link"
              onClick={() => scrollToSection('sobre-nosotros')}
            >
              QUIÉNES SOMOS
            </Nav.Link>
            <Nav.Link
              as="button"
              className="nav-link"
              onClick={() => scrollToSection('servicios')}
            >
              SERVICIOS
            </Nav.Link>
            <Nav.Link
              as="button"
              className="nav-link"
              onClick={() => scrollToSection('contacto')}
            >
              CONTACTO
            </Nav.Link>
          </Nav>

          {/* ACCIONES */}
          <div className="navbar-actions">
            {user ? (
              <Button
                onClick={handleLogout}
                className="logout-btn btn-reservar-turno"
              >
                Cerrar Sesión
              </Button>
            ) : (
              <>
                <div className="navbar-social">
                  <a
                    href="https://www.instagram.com/pisostylebarbershop/"
                    className="social-icon"
                    target="_blank"
                    rel="noreferrer"
                  >
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
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default Header
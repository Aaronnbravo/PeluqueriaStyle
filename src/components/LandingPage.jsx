import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import './../App.css'
import heroImage from '../images/ImgHeroArea.jpg'
import logo from '../images/Logo.png'

// Importar todas las imágenes del carousel
import corte1 from '../images/cortes/corte1.jpeg'
import corte2 from '../images/cortes/corte2.jpeg'
import corte3 from '../images/cortes/corte3.jpeg'
import corte4 from '../images/cortes/corte4.jpeg'
import corte5 from '../images/cortes/corte5.jpeg'
import corte6 from '../images/cortes/corte6.jpeg'


function LandingPage() {
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const images = [corte1, corte2, corte3, corte4, corte5, corte6]

  // Detectar cambios en el tamaño de la pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Función para cambiar slide con transición
  const changeSlide = (newIndex) => {
    setCurrentSlide(newIndex)
  }

  // Carousel automático
  useEffect(() => {
    const interval = setInterval(() => {
      changeSlide((currentSlide + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [currentSlide, images.length])

  const nextSlide = () => {
    changeSlide((currentSlide + 1) % images.length)
  }

  const prevSlide = () => {
    changeSlide((currentSlide - 1 + images.length) % images.length)
  }

  const scrollToSection = (sectionId) => {
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
  }

  return (
    <div className="landing-page">
      {/* HERO SECTION */}
      <section id="inicio" className="hero-area">
        <Container>
          <Row className={`align-items-center hero-row ${isMobile ? 'mobile-hero' : ''}`}>
            <Col lg={6} className="hero-content">
              <h1 className={`hero-main-title animate-fade-up ${isMobile ? 'mobile-title' : ''}`}>
                <span className="piso-text">PISO</span>{' '}
                <span className="style-text">STYLE</span>
              </h1>
              <h2 className={`hero-subtitle animate-fade-up animate-delay-1 ${isMobile ? 'mobile-subtitle' : ''}`}>
                Barber Shop
              </h2>
              <p className={`hero-description animate-fade-up animate-delay-2 ${isMobile ? 'mobile-description' : ''}`}>
                Más que un corte, una experiencia
              </p>
              <div className={`hero-buttons animate-fade-up animate-delay-2 ${isMobile ? 'mobile-buttons' : ''}`}>
                <button
                  className="btn-primary-custom"
                  onClick={() => navigate('/login')}
                >
                  {isMobile ? 'RESERVAR' : 'RESERVA AHORA'}
                </button>
                <button
                  className="btn-outline-custom"
                  onClick={() => scrollToSection('servicios')}
                >
                  {isMobile ? 'SERVICIOS' : 'VER SERVICIOS'}
                </button>
              </div>
            </Col>

            <Col lg={6} className="hero-image">
              <div className={`hero-image-container animate-fade-right ${isMobile ? 'mobile-hero-image' : ''}`}>
                <img
                  src={heroImage}
                  alt="PisoStyle Peluquería - Barber Shop"
                  className="hero-real-image"
                />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* QUIÉNES SOMOS */}
      <section id="sobre-nosotros" className="about-section">
        <div className="about-decorative-element"></div>
        <Container>
          <Row className={`align-items-center ${isMobile ? 'mobile-about-row' : ''}`}>
            <Col lg={6} className={isMobile ? 'order-2' : ''}>
              <div className="about-carousel animate-fade-left">
                <div className={`carousel-container ${isMobile ? 'mobile-carousel' : ''}`}>
                  <img
                    src={images[currentSlide]}
                    alt={`Corte de pelo ${currentSlide + 1}`}
                    className="carousel-image"
                    key={currentSlide}
                  />

                  {/* Flechas de navegación */}
                  <button className="carousel-arrow carousel-arrow-prev" onClick={prevSlide}>
                    ‹
                  </button>
                  <button className="carousel-arrow carousel-arrow-next" onClick={nextSlide}>
                    ›
                  </button>
                </div>
              </div>
            </Col>

            <Col lg={6} className={isMobile ? 'order-1 mb-4' : ''}>
              <div className="about-content animate-fade-right">
                <h2 className={`section-title ${isMobile ? 'mobile-section-title' : ''}`}>
                  QUIÉNES SOMOS
                </h2>

                <div className="about-text-content">
                  <p className={`about-text ${isMobile ? 'mobile-about-text' : ''}`}>
                    Hace <strong>3 años</strong> abrimos nuestras puertas con una idea clara: <strong>ofrecer cortes modernos y actuales</strong>. Nos capacitamos constantemente y brindamos un trato especial a cada cliente, porque creemos que cada estilo es único.
                  </p>
                </div>

                <div className={`about-features ${isMobile ? 'mobile-features' : ''}`}>
                  <div className="feature-card">
                    <i className="fas fa-star"></i>
                    <span>3 años de experiencia</span>
                  </div>

                  <div className="feature-card">
                    <i className="fas fa-gem"></i>
                    <span>Productos premium</span>
                  </div>

                  <div className="feature-card">
                    <i className="fa-solid fa-scissors"></i>
                    <span>Cortes últimos modelos</span>
                  </div>

                  <div className="feature-card">
                    <i className="fa-solid fa-paintbrush"></i>
                    <span>Tratamientos capilares</span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="services-section">
        <Container>
          <div className="services-header animate-fade-up">
            <h2 className={`section-title ${isMobile ? 'mobile-section-title' : ''}`}>
              NUESTROS SERVICIOS
            </h2>
            <p className={`services-subtitle ${isMobile ? 'mobile-services-subtitle' : ''}`}>
              Dentro de nuestros servicios te ofrecemos:
            </p>
          </div>

          <Row className="justify-content-center">
            <Col lg={10}>
              <Row className="g-3">
                <Col xs={6} md={4} className="text-center animate-fade-up animate-delay-1">
                  <div className={`service-button ${isMobile ? 'mobile-service-button' : ''}`}>
                    <i className="fa-solid fa-scissors"></i>
                    <span>CORTE DE CABELLO</span>
                  </div>
                </Col>

                <Col xs={6} md={4} className="text-center animate-fade-up animate-delay-1">
                  <div className={`service-button ${isMobile ? 'mobile-service-button' : ''}`}>
                    <i className="fa-solid fa-paintbrush"></i>
                    <span>ARREGLO DE BARBA</span>
                  </div>
                </Col>

                <Col xs={6} md={4} className="text-center animate-fade-up animate-delay-1">
                  <div className={`service-button ${isMobile ? 'mobile-service-button' : ''}`}>
                    <i className="fa-solid fa-circle-half-stroke"></i>
                    <span>ASESORAMIENTO PERSONALIZADO</span>
                  </div>
                </Col>

                <Col xs={6} md={4} className="text-center animate-fade-up animate-delay-2">
                  <div className={`service-button ${isMobile ? 'mobile-service-button' : ''}`}>
                    <i className="fa-solid fa-cube"></i>
                    <span>Productos para el cabello y babra</span>
                  </div>
                </Col>

                <Col xs={6} md={4} className="text-center animate-fade-up animate-delay-2">
                  <div className={`service-button ${isMobile ? 'mobile-service-button' : ''}`}>
                    <i className="fa-solid fa-droplet"></i>
                    <span>TRATAMIENTOS CAPILARES</span>
                  </div>
                </Col>

                <Col xs={6} md={4} className="text-center animate-fade-up animate-delay-2">
                  <div className={`service-button ${isMobile ? 'mobile-service-button' : ''}`}>
                    <i className="fa-solid fa-layer-group"></i>
                    <span>COLOR</span>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="contact-section">
        <Container>
          <div className="contact-header">
            <h2 className={`section-title ${isMobile ? 'mobile-section-title' : ''}`}>
              CONTACTO
            </h2>
          </div>

          <Row className="justify-content-center">
            <Col lg={10}>
              <Row className={`align-items-stretch contact-row ${isMobile ? 'mobile-contact-row' : ''}`}>
                <Col md={6} className={isMobile ? 'mb-4' : ''}>
                  <div className="contact-column contact-info">
                    <div className="contact-item">
                      <h5>DIRECCIÓN:</h5>
                      <p>
                        Jujuy 1442<br />
                        Mar del Plata, Buenos Aires.
                      </p>
                    </div>

                    <div className="contact-item">
                      <h5>INSTAGRAM:</h5>
                      <p>
                        <a href="mailto:danielseleya2124@gmail.com">@pisostylebarbershop</a>
                      </p>
                    </div>

                    <div className="contact-item">
                      <h5>TELÉFONO:</h5>
                      <p>+54 9 2233-540664</p>
                    </div>

                    <div className="contact-item">
                      <h5>HORARIO DE ATENCIÓN:</h5>
                      <p>Lunes a sábados de 10 a 20 hs.</p>
                    </div>

                    <div className="contact-item">
                      <h5>FORMAS DE PAGO:</h5>
                      <p>Transferencia <br />
                        Efectivo</p>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="contact-column contact-map">
                    <h5>UBICACIÓN</h5>

                    {/* Mapa de Google Maps */}
                    <div className={`map-container ${isMobile ? 'mobile-map' : ''}`}>
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3144.106384563234!2d-57.555819!3d-37.9932285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9584dd6aeb3030c7%3A0xed3c3c83467650d1!2sPiso%20Style%20Barber%20Shop!5e0!3m2!1ses!2sar!4v1700000000000&theme=dark"
                        width="100%"
                        height={isMobile ? "200" : "300"}
                        style={{
                          border: 0,
                          borderRadius: '8px',
                          filter: 'invert(90%) hue-rotate(180deg) contrast(90%)' // Efecto oscuro adicional
                        }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Ubicación de Piso Style Peluquería"
                      ></iframe>
                    </div>

                    {/* Botón centrado */}
                    <div className="text-center mt-4">
                      <Button
                        className={`btn-google-maps-custom ${isMobile ? 'mobile-map-btn' : ''}`}
                        href="https://www.google.com/maps/place/Piso+Style+Barber+Shop/@-37.9932285,-57.555819,17z/data=!3m1!4b1!4m6!3m5!1s0x9584dd6aeb3030c7:0xed3c3c83467650d1!8m2!3d-37.9932328!4d-57.5532387!16s%2Fg%2F11vhxj6775?entry=ttu&g_ep=EgoyMDI1MTIwOS4wIKXMDSoASAFQAw%3D%3D"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {isMobile ? 'ABRIR MAPA' : 'ABRIR EN GOOGLE MAPS'}
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Container>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <Container>
          <Row className={`align-items-center ${isMobile ? 'mobile-footer-row' : ''}`}>
            <Col md={6} className={isMobile ? 'text-center mb-3' : ''}>
              <img
                src={logo}
                alt="Ian Castillo"
                className={`logo-imagen ${isMobile ? 'mobile-logo' : ''}`}
              />
              <p className={`footer-text ${isMobile ? 'mobile-footer-text' : ''}`}>
                SINCE 2023 • Más que un corte, una experiencia
              </p>
            </Col>
            <Col md={6} className={`text-md-end ${isMobile ? 'text-center' : ''}`}>
              <p className={`footer-copyright ${isMobile ? 'mobile-footer-copyright' : ''}`}>
                Since 2023 PisoStyleBarbershop. Todos los derechos reservados.
              </p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  )
}

export default LandingPage
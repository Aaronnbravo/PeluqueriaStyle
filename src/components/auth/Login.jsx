import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
    showPassword: false
  })
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  // Cargar datos guardados si existe "rememberMe"
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername')
    if (savedUsername) {
      setFormData(prev => ({
        ...prev,
        username: savedUsername,
        rememberMe: true
      }))
    }
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Guardar usuario si está marcado "rememberMe"
    if (formData.rememberMe) {
      localStorage.setItem('rememberedUsername', formData.username)
    } else {
      localStorage.removeItem('rememberedUsername')
    }

    const result = await login(formData.username, formData.password, formData.rememberMe)
    
    if (result.success) {
      if (result.user.type === 'admin') {
        navigate('/admin')
      } else {
        navigate('/client')
      }
    } else {
      setError(result.error || 'Error en el login')
    }
  }

  const togglePasswordVisibility = () => {
    setFormData({
      ...formData,
      showPassword: !formData.showPassword
    })
  }

  return (
    <div className="login-container">
      <Container>
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="login-card">
              <Card.Body className="login-card-body">
                <div className="text-center">
                  <h2 className="login-title">Iniciar Sesión</h2>
                  <p className="login-subtitle">Accede a tu cuenta</p>
                </div>
                
                {error && (
                  <Alert variant="danger" className="mb-4">
                    {error}
                  </Alert>
                )}
                
                <Form onSubmit={handleSubmit}>
                  <div className="login-form-group">
                    <label className="login-label">Usuario o DNI</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      placeholder="Ingresa tu usuario o DNI"
                      className="login-input"
                    />
                  </div>

                  <div className="login-form-group">
                    <label className="login-label">Contraseña</label>
                    <div className="password-input-group">
                      <input
                        type={formData.showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Ingresa tu contraseña"
                        className="login-input"
                      />
                      <Button
                        variant="outline-secondary"
                        type="button"
                        className="password-toggle-btn"
                        onClick={togglePasswordVisibility}
                      >
                        <i className={`fa-solid ${formData.showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </Button>
                    </div>
                  </div>

                  <div className="login-options mb-4">
                    <Form.Check
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      label="Mantenerme conectado"
                      className="remember-checkbox"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="login-button"
                    disabled={loading}
                  >
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </button>
                </Form>

                <div className="text-center">
                  <p className="login-link-text">
                    ¿No tienes cuenta?{' '}
                    <button 
                      onClick={() => navigate('/register')}
                      className="login-link"
                    >
                      Regístrate aquí
                    </button>
                  </p>
                  
                  {/* ENLACE NUEVO PARA RECUPERAR CONTRASEÑA */}
                  <p className="login-link-text">
                    <button 
                      onClick={() => navigate('/forgot-password')}
                      className="login-link"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Login
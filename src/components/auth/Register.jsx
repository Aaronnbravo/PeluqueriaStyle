import React, { useState } from 'react'
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import './Register.css'
import { isUsernameTaken, isDocumentTaken } from '../../services/users'


function Register() {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    document: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
    showPassword: false
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const validateForm = () => {
    setError('')

    if (!formData.username || formData.username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres')
      return false
    }

    if (!formData.firstName || !formData.lastName) {
      setError('Nombre y apellido son obligatorios')
      return false
    }

    if (!formData.document || !/^\d+$/.test(formData.document)) {
      setError('El DNI debe contener solo números')
      return false
    }

    if (formData.document.length < 7 || formData.document.length > 10) {
      setError('El DNI debe tener entre 7 y 10 dígitos')
      return false
    }

    if (!formData.password || formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return false
    }

    return true
  }

const handleSubmit = async (e) => {
  e.preventDefault()
  
  if (!validateForm()) {
    return
  }

  setLoading(true)

  try {
    // Verificar si username ya existe
    const usernameTaken = await isUsernameTaken(formData.username)
    if (usernameTaken) {
      setError('El nombre de usuario ya está en uso')
      setLoading(false)
      return
    }

    // Verificar si documento ya existe
    const documentTaken = await isDocumentTaken(formData.document)
    if (documentTaken) {
      setError('El DNI ya está registrado')
      setLoading(false)
      return
    }

    // Proceder con el registro
    const userData = {
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      document: formData.document,
      password: formData.password,
      rememberMe: formData.rememberMe
    }

    const result = await register(userData)
    
    if (result.success) {
      setSuccess('¡Registro exitoso! Redirigiendo...')
      setTimeout(() => {
        navigate('/client')
      }, 2000)
    } else {
      setError(result.error || 'Error en el registro')
    }
    
  } catch (error) {
    setError('Error en el registro: ' + error.message)
  } finally {
    setLoading(false)
  }
}
  const togglePasswordVisibility = () => {
    setFormData({
      ...formData,
      showPassword: !formData.showPassword
    })
  }

  return (
    <div className="register-container">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="register-card">
              <Card.Body className="register-card-body">
                <div className="text-center mb-4">
                  <h2 className="register-title">Crear Cuenta</h2>
                  <p className="register-subtitle">Registro</p>
                </div>

                {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
                {success && <Alert variant="success" className="mb-3">{success}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                  {/* Usuario */}
                  <Form.Group className="mb-3">
                    <Form.Label>Nombre de Usuario *</Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      placeholder="ej: juanperez2024"
                      minLength={3}
                      maxLength={20}
                    />
                    <Form.Text className="text-muted">
                      Será tu usuario para iniciar sesión
                    </Form.Text>
                  </Form.Group>

                  {/* Nombre y Apellido */}
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nombre *</Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          placeholder="Ingresa tu nombre"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Apellido *</Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          placeholder="Ingresa tu apellido"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* DNI */}
                  <Form.Group className="mb-3">
                    <Form.Label>DNI *</Form.Label>
                    <Form.Control
                      type="text"
                      name="document"
                      value={formData.document}
                      onChange={handleChange}
                      required
                      placeholder="sin puntos ni espacios"
                      pattern="[0-9]*"
                      minLength={7}
                      maxLength={10}
                    />
                    <Form.Text className="text-muted">
                      Solo números (sin puntos)
                    </Form.Text>
                  </Form.Group>

                  {/* Contraseña */}
                  <Form.Group className="mb-3">
                    <Form.Label>Contraseña *</Form.Label>
                    <div className="password-input-group">
                      <Form.Control
                        type={formData.showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
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
                  </Form.Group>

                  {/* Confirmar Contraseña */}
                  <Form.Group className="mb-4">
                    <Form.Label>Confirmar Contraseña *</Form.Label>
                    <Form.Control
                      type={formData.showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Repite tu contraseña"
                    />
                  </Form.Group>

                  {/* Mantener conectado */}
                  <Form.Group className="mb-4">
                    <Form.Check
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      label="Mantenerme conectado"
                      className="remember-checkbox"
                    />
                  </Form.Group>

                  <Button
                    variant="success"
                    type="submit"
                    disabled={loading}
                    className="w-100 py-2"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Registrando...
                      </>
                    ) : (
                      'Crear Cuenta'
                    )}
                  </Button>
                </Form>

                <div className="text-center mt-4 pt-3 border-top">
                  <p className="register-link-text">
                    <Button 
                      variant="link" 
                      onClick={() => navigate('/login')}
                      className="register-link p-0"
                    >
                      ¿Ya tienes cuenta? Inicia sesión
                    </Button>
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

export default Register
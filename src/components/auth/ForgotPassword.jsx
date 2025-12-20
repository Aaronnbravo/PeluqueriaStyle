import React, { useState } from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Reutiliza los estilos del login

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Verificación, 2: Cambiar contraseña
  const [formData, setFormData] = useState({
    username: '',
    document: '',
    newPassword: '',
    confirmPassword: '',
    showPassword: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const togglePasswordVisibility = () => {
    setFormData({
      ...formData,
      showPassword: !formData.showPassword
    });
  };

  // Verificar usuario
  const handleVerifyUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.username || !formData.document) {
      setError('Por favor, completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      // Importar las funciones desde services
      const userService = await import('../../services/users');
      
      // Usar la función que ya existe para buscar usuarios
      const result = await userService.verifyUserForPasswordRecovery(formData.username, formData.document);
      
      if (result.success) {
        setUserId(result.userId);
        setSuccess('Usuario verificado correctamente. Ahora puedes cambiar tu contraseña.');
        setStep(2);
      } else {
        setError(result.error || 'Error al verificar usuario');
      }
    } catch (error) {
      console.error('Error en verificación:', error);
      setError('Error en la verificación. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Por favor, completa todos los campos');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      // Importar las funciones desde services
      const userService = await import('../../services/users');
      
      const result = await userService.updateUserPassword(userId, formData.newPassword);
      
      if (result.success) {
        setSuccess('¡Contraseña cambiada exitosamente! Redirigiendo al login...');
        
        // Limpiar formulario
        setFormData({
          username: '',
          document: '',
          newPassword: '',
          confirmPassword: '',
          showPassword: false
        });
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.error || 'Error al cambiar la contraseña');
      }
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      setError('Error al cambiar contraseña. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="login-container">
      <Container>
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="login-card">
              <Card.Body className="login-card-body">
                <div className="text-center">
                  <h2 className="login-title">
                    {step === 1 ? 'Recuperar Contraseña' : 'Cambiar Contraseña'}
                  </h2>
                  <p className="login-subtitle">
                    {step === 1 
                      ? 'Verifica tu identidad para recuperar tu contraseña' 
                      : 'Crea una nueva contraseña para tu cuenta'}
                  </p>
                </div>
                
                {error && (
                  <Alert variant="danger" className="mb-4">
                    {error}
                  </Alert>
                )}
                
                {success && (
                  <Alert variant="success" className="mb-4">
                    {success}
                  </Alert>
                )}
                
                {step === 1 ? (
                  // PASO 1: Verificación
                  <form onSubmit={handleVerifyUser}>
                    <div className="login-form-group">
                      <label className="login-label">Nombre de Usuario</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        placeholder="Ingresa tu nombre de usuario"
                        className="login-input"
                      />
                    </div>

                    <div className="login-form-group">
                      <label className="login-label">Documento (DNI)</label>
                      <input
                        type="text"
                        name="document"
                        value={formData.document}
                        onChange={handleChange}
                        required
                        placeholder="Ingresa tu documento sin puntos"
                        className="login-input"
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="login-button"
                      disabled={loading}
                    >
                      {loading ? 'Verificando...' : 'Verificar Identidad'}
                    </button>
                  </form>
                ) : (
                  // PASO 2: Cambiar contraseña
                  <form onSubmit={handleChangePassword}>
                    <div className="login-form-group">
                      <label className="login-label">Nueva Contraseña</label>
                      <div className="password-input-group">
                        <input
                          type={formData.showPassword ? "text" : "password"}
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleChange}
                          required
                          placeholder="Mínimo 6 caracteres"
                          minLength={6}
                          className="login-input"
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={togglePasswordVisibility}
                        >
                          <i className={`fa-solid ${formData.showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    <div className="login-form-group">
                      <label className="login-label">Confirmar Nueva Contraseña</label>
                      <input
                        type={formData.showPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="Repite la nueva contraseña"
                        className="login-input"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button 
                        type="submit" 
                        className="login-button"
                        disabled={loading}
                      >
                        {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
                      </button>

                      <button 
                        type="button"
                        onClick={() => setStep(1)}
                        disabled={loading}
                        style={{ 
                          backgroundColor: 'transparent',
                          color: '#b95ec7',
                          border: '2px solid #b95ec7',
                          borderRadius: '8px',
                          padding: '12px',
                          fontWeight: '600',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        ← Volver a Verificación
                      </button>
                    </div>
                  </form>
                )}

                <div className="text-center mt-4">
                  <button 
                    onClick={handleBackToLogin}
                    className="login-link"
                  >
                    ← Volver al Inicio de Sesión
                  </button>
                </div>

                <div className="login-demo-info mt-4">
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>
                    <strong>Nota:</strong> Para recuperar tu contraseña, necesitas 
                    tu nombre de usuario y documento exactos.
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default ForgotPassword;
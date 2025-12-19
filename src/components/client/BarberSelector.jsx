import React, { useState } from 'react';
import { Card, Row, Col, Alert } from 'react-bootstrap';

const BARBERS = [
  {
    id: 'santiago',
    name: 'Santiago',
    image: '/images/Barbers/Santuu.jpg',
    interval: 30,
    description: 'Corte clásico y moderno'
  },
  {
    id: 'mili',
    name: 'Mili',
    image: 'src/images/Barbers/Mili.JPG',
    interval: 45,
    description: 'Coloración y estilismo'
  }
];

function BarberSelector({ onBarberSelect, selectedBarber }) {
  const [selected, setSelected] = useState(selectedBarber);

  const handleSelect = (barber) => {
    setSelected(barber);
    if (onBarberSelect) {
      onBarberSelect(barber);
    }
  };

  return (
    <Card className="barber-selector-card mb-4">
      <Card.Header>
        <h5><i className="fa-solid fa-user-check me-2"></i> Selecciona tu peluquero</h5>
      </Card.Header>
      <Card.Body>
        <Alert variant="info" className="mb-3">
          <i className="fa-solid fa-info-circle me-2"></i>
          Cada peluquero tiene diferentes intervalos entre turnos. Santiago trabaja cada 30 minutos y Mili cada 45 minutos.
        </Alert>
        
        <Row className="g-3">
          {BARBERS.map((barber) => (
            <Col key={barber.id} xs={12} sm={6}>
              <div 
                className={`barber-card ${selected?.id === barber.id ? 'selected' : ''}`}
                onClick={() => handleSelect(barber)}
              >
                <div className="barber-image-container">
                  <img 
                    src={barber.image} 
                    alt={barber.name}
                    className="barber-image"
                    onError={(e) => {
                      e.target.src = '/images/default-barber.jpg';
                      e.target.alt = 'Imagen no disponible';
                    }}
                  />
                  <div className="barber-badge">
                    <i className="fa-solid fa-scissors"></i>
                  </div>
                </div>
                <div className="barber-info">
                  <h6 className="barber-name">{barber.name}</h6>
                  <p className="barber-description">{barber.description}</p>
                  <div className="barber-interval">
                    <span className="interval-badge">
                      <i className="fa-solid fa-clock me-1"></i>
                      Turnos cada {barber.interval} min
                    </span>
                  </div>
                </div>
                {selected?.id === barber.id && (
                  <div className="selected-indicator">
                    <i className="fa-solid fa-check-circle"></i>
                  </div>
                )}
              </div>
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  );
}

export default BarberSelector;
import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'react-bootstrap';

function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  return (
    <Modal show={showPrompt} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>📱 Instalar App</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>¿Quieres instalar Ian Castillo App para acceso rápido?</p>
        <p><small>Podrás acceder desde tu pantalla principal como una app nativa.</small></p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Ahora no
        </Button>
        <Button variant="danger" onClick={handleInstall}>
          ¡Instalar!
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default InstallPrompt;
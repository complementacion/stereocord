/**
 * @name        MessageLogger
 * @description Guarda en consola los mensajes eliminados/editados.
 * @version     1.0.0
 * @author      StereoCord
 */

class MessageLogger {
  static meta = {
    name:        'MessageLogger',
    description: 'Registra mensajes eliminados y editados en la consola de DevTools.',
    version:     '1.0.0',
    author:      'StereoCord',
  };

  constructor() {
    this._unpatch = null;
    this._log = [];
  }

  start() {
    const Webpack = window.StereoCord?.Webpack;
    if (!Webpack) {
      console.warn('[MessageLogger] StereoCord Webpack no disponible');
      return;
    }

    // Buscar el dispatcher de Discord
    const Dispatcher = Webpack.getByProps('dispatch', 'subscribe');
    if (!Dispatcher) {
      console.warn('[MessageLogger] Dispatcher no encontrado');
      return;
    }

    this._onDelete = ({ message }) => {
      console.log('%c[MessageLogger] Mensaje eliminado:', 'color:#ed4245;font-weight:bold', message);
      this._log.push({ type: 'delete', message, time: new Date() });
    };
    this._onUpdate = ({ message }) => {
      console.log('%c[MessageLogger] Mensaje editado:', 'color:#fee75c;font-weight:bold', message);
      this._log.push({ type: 'edit', message, time: new Date() });
    };

    Dispatcher.subscribe('MESSAGE_DELETE', this._onDelete);
    Dispatcher.subscribe('MESSAGE_UPDATE', this._onUpdate);

    window.StereoCord.showToast('MessageLogger activo — abre DevTools (Ctrl+Shift+I)', 'info', 4000);
  }

  stop() {
    const Webpack = window.StereoCord?.Webpack;
    const Dispatcher = Webpack?.getByProps('dispatch', 'subscribe');
    if (Dispatcher) {
      if (this._onDelete) Dispatcher.unsubscribe('MESSAGE_DELETE', this._onDelete);
      if (this._onUpdate) Dispatcher.unsubscribe('MESSAGE_UPDATE', this._onUpdate);
    }
    this._log = [];
  }

  /** Obtener el log completo desde la consola: StereoCord.Plugins._plugins.get('MessageLogger').instance.getLog() */
  getLog() { return this._log; }
}

module.exports = MessageLogger;

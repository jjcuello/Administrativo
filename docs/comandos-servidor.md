Comandos rápidos del servidor

Arranque remoto de la app

- Desde la raíz del repositorio, ejecutar:

  ./arrancar-server

Qué hace

- Se conecta por SSH a 192.168.88.132 por el puerto 2468.
- Entra en ~/academia-ana del servidor.
- Reinicia el proceso PM2 academia-ana-dev.
- Levanta la app con npm run dev en el puerto 3000.
- Guarda la configuración de PM2 y muestra el estado final.

Variables opcionales

- ACADEMIA_REMOTE_HOST
- ACADEMIA_REMOTE_PORT
- ACADEMIA_REMOTE_USER
- ACADEMIA_REMOTE_APP_DIR
- ACADEMIA_PM2_APP_NAME
- ACADEMIA_APP_PORT

Ejemplo:

ACADEMIA_APP_PORT=3001 ./arrancar-server

Mantenimiento rápido de disco

- Desde la raíz del repositorio, ejecutar:

  ./mantener-disco-server

Qué hace

- Se conecta por SSH a 192.168.88.132 por el puerto 2468.
- Muestra el uso actual de `/`, `.next`, `~/.npm`, `~/.pm2` y `/var/log`.
- Limpia cachés y archivos regenerables que puede manejar el usuario actual.
- Hace `pm2 flush` sobre `academia-ana-dev`.
- Verifica el healthcheck HTTP de la app.

Reinicio fuerte de caché Next

- Si necesitas resetear `.next` y reiniciar PM2, ejecutar:

  ACADEMIA_RESET_NEXT=1 ./mantener-disco-server

Variables opcionales

- ACADEMIA_REMOTE_HOST
- ACADEMIA_REMOTE_PORT
- ACADEMIA_REMOTE_USER
- ACADEMIA_REMOTE_APP_DIR
- ACADEMIA_PM2_APP_NAME
- ACADEMIA_APP_PORT
- ACADEMIA_RESET_NEXT
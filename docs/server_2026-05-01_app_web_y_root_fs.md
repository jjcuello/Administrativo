Estado del servidor .132 al 2026-05-01

Resumen
- Servidor: 192.168.88.132:2468
- App web: /home/jcuello/APP-FANA
- Proceso web en PM2: academia-ana-dev
- PM2 systemd: pm2-jcuello.service

Cambios aplicados
- Se corrigio el autostart de PM2 mediante override systemd en /etc/systemd/system/pm2-jcuello.service.d/override.conf con:
  [Service]
  PIDFile=
- Se migro la APP-WEB de next dev a next start bajo PM2.
- Se guardo el estado de PM2 con pm2 save.
- Se corrigieron errores de TypeScript que bloqueaban next build en:
  - src/app/gestion/personal/page.tsx
  - src/app/reportes/page.tsx
  - src/lib/aiAgent/tools.ts
- Se amplio la raiz LVM de 15G a 65G.

Estado validado
- systemd: pm2-jcuello.service activo y estable.
- PM2: academia-ana-dev online con script args start.
- HTTP local: 127.0.0.1:3000 responde 200 OK.
- /dev/mapper/fedora-root: 65G totales, ~14G usados, ~52G libres, ~21% uso.
- .next en APP-FANA: ~18M tras migracion a build/start.

Hallazgos tecnicos
- El problema de espacio no era el disco fisico: el VG fedora tenia ~1.80T libres y root solo 15G.
- El fallo post-corte electrico venia del PIDFile de PM2 en systemd, que dejaba pm2-jcuello en bucle de start/timeout.
- Correr next dev en servidor hacia crecer .next/dev y presionaba la raiz.

Comandos ejecutados de forma efectiva
- PM2/systemd:
  - pm2 save
  - override systemd para vaciar PIDFile
- Web:
  - npm run build
  - pm2 start npm --name academia-ana-dev -- start
- LVM/XFS:
  - sudo lvextend -L +50G /dev/fedora/root
  - sudo xfs_growfs /

Pendiente recomendado
- Mantener despliegues usando APP-FANA como ruta remota principal.
- Si la app vuelve a crecer, revisar logs y artefactos, pero el riesgo estructural inmediato de / quedo mitigado.

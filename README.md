# Sistema de Asistencia — Alaia Wellness Club

Proyecto base: Next.js + TypeScript + Supabase.

## Qué incluye esta primera versión
- Pantalla de marcación (selección de persona + PIN + Entrada/Salida) con geolocalización.
- Cada persona crea su propio PIN de 4 dígitos la primera vez que ingresa; nadie, excepto administracion
- API que valida la geocerca, el PIN, bloquea duplicados y calcula tardanza/tiempo adicional/saldo.
- Script SQL con las tablas PERSONAL, ASISTENCIA y AUDITORIA.

Pendiente para siguientes fases: panel de Administración (login, historial, incidencias, reportes PDF) — ver "Plan de desarrollo" en el ERS.


## Notas
- `.env.local` nunca debe subirse a GitHub (ya está en `.gitignore` que crea Next.js por defecto — verifica que exista). (No te juzgaría si lo haces, me paso muchas veces jsjk)
- El código QR de este primer prototipo puede simplemente apuntar a la URL pública del proyecto una vez desplegado.
-Falta mejorar a detalle esta parte.

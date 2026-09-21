# Sistema de Asistencia — Alaia Wellness Club

Proyecto base: Next.js + TypeScript + Supabase.

## Qué incluye esta primera versión
- Pantalla de marcación (selección de persona + PIN + Entrada/Salida) con geolocalización.
- Cada persona crea su propio PIN de 4 dígitos la primera vez que ingresa; nadie, excepto administracion
- API que valida la geocerca, el PIN, bloquea duplicados y calcula tardanza/tiempo adicional/saldo.
- Script SQL con las tablas PERSONAL, ASISTENCIA y AUDITORIA.

Pendiente para siguientes fases: panel de Administración (login, historial, incidencias, reportes PDF) — ver "Plan de desarrollo" en el ERS.



El login del panel usa Supabase Auth. Para crear tu usuario:
1. Ve a supabase.com > tu proyecto > Authentication > Users.
2. Haz clic en "Add user" > "Create new user".
3. Pon tu correo y una contraseña. Marca "Auto Confirm User" (así no necesitas verificar el correo).
4. Con eso ya puedes entrar en `/admin/login` con ese correo y contraseña.


## Notas
- `.env.local` nunca debe subirse a GitHub (ya está en `.gitignore` que crea Next.js por defecto — verifica que exista). (No te juzgaría si lo haces, me paso muchas veces jsjk)
- El código QR de este primer prototipo puede simplemente apuntar a la URL pública del proyecto una vez desplegado.
-Falta mejorar a detalle esta parte.
import express from 'express';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import { getDbClient } from '../helpers/conexion-bd.js';
import { esInvitado, estaAutenticado } from '../middlewares/auth.js';
import { registrarActividad } from '../helpers/logger.js';

const router = express.Router();

// GET /autenticacion/registro
router.get('/registro', esInvitado, (req, res) => {
    registrarActividad("✔️🌐 GET /autenticacion/registro - El usuario visitó la página de Registro.");
    res.render('registro', {
        titulo: 'Registro de Usuario',
        clinica: 'VetCare Pro',
        nombreClinica: 'VetCare Pro',
        error: null
    });
});

// POST /autenticacion/registro
router.post('/registro', esInvitado, async (req, res) => {
    const { nombre, email, password } = req.body;
    const client = getDbClient();

    try {
        // Validaciones básicas antes de tocar la BD
        if (!nombre || !validator.isEmail(email) || !password) {
            registrarActividad(`⚠️🔐 REGISTRO RECHAZADO: Datos incompletos o email inválido (${email}).`);
            return res.render('registro', {
                titulo: 'Registro de Usuario',
                clinica: 'VetCare Pro',
                nombreClinica: 'VetCare Pro',
                error: 'Debes completar tu nombre, un email válido y una contraseña.'
            });
        }

        if (password.length < 8) {
            registrarActividad(`⚠️🔐 REGISTRO RECHAZADO: Contraseña demasiado corta (${email}).`);
            return res.render('registro', {
                titulo: 'Registro de Usuario',
                clinica: 'VetCare Pro',
                nombreClinica: 'VetCare Pro',
                error: 'La contraseña debe tener al menos 8 caracteres.'
            });
        }

        registrarActividad(`🔐 REGISTRO: Intentando registrar usuario "${nombre}" (${email})...`);
        await client.connect();

        const passwordHash = await bcrypt.hash(password, 10);

        await client.query(
            'INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3)',
            [validator.escape(nombre), email, passwordHash]
        );
        await client.end();

        registrarActividad(`✔️🔐 REGISTRO ÉXITO: Usuario "${nombre}" (${email}) creado correctamente.`);
        res.redirect('/autenticacion/login');

    } catch (error) {
        await client.end().catch(() => {});

        // 23505 = violación de restricción UNIQUE en Postgres (el email ya existe)
        if (error.code === '23505') {
            registrarActividad(`❌🔐 REGISTRO RECHAZADO: Email duplicado (${email}).`);
            return res.render('registro', {
                titulo: 'Registro de Usuario',
                clinica: 'VetCare Pro',
                nombreClinica: 'VetCare Pro',
                error: 'Ese correo electrónico ya está registrado. Intenta iniciar sesión.'
            });
        }

        registrarActividad(`❌🔐 REGISTRO ERROR CRÍTICO: ${error.message}`);
        console.error('Error en registro:', error);
        res.status(500).send('Error al registrar usuario');
    }
});

// GET /autenticacion/login
router.get('/login', esInvitado, (req, res) => {
    registrarActividad("✔️🌐 GET /autenticacion/login - El usuario visitó la página de Iniciar Sesión.");
    res.render('login', {
        titulo: 'Iniciar Sesión',
        clinica: 'VetCare Pro',
        nombreClinica: 'VetCare Pro',
        error: null
    });
});

// POST /autenticacion/login
router.post('/login', esInvitado, async (req, res) => {
    const { email, password } = req.body;
    const client = getDbClient();
    const mensajeCredencialesInvalidas = 'Email o contraseña incorrectos.';

    try {
        if (!validator.isEmail(email) || !password) {
            registrarActividad(`⚠️🔐 LOGIN RECHAZADO: Email inválido o contraseña vacía (${email}).`);
            return res.render('login', {
                titulo: 'Iniciar Sesión',
                clinica: 'VetCare Pro',
                nombreClinica: 'VetCare Pro',
                error: mensajeCredencialesInvalidas
            });
        }

        registrarActividad(`🔐 LOGIN: Intento de inicio de sesión para "${email}"...`);
        await client.connect();

        const resultado = await client.query(
            'SELECT id, nombre, email, password_hash FROM usuarios WHERE email = $1',
            [email]
        );
        await client.end();

        if (resultado.rows.length === 0) {
            registrarActividad(`❌🔐 LOGIN FALLIDO: Email no registrado (${email}).`);
            return res.render('login', {
                titulo: 'Iniciar Sesión',
                clinica: 'VetCare Pro',
                nombreClinica: 'VetCare Pro',
                error: mensajeCredencialesInvalidas
            });
        }

        const usuario = resultado.rows[0];
        const esClaveValida = await bcrypt.compare(password, usuario.password_hash);

        if (!esClaveValida) {
            registrarActividad(`❌🔐 LOGIN FALLIDO: Contraseña incorrecta para "${email}".`);
            return res.render('login', {
                titulo: 'Iniciar Sesión',
                clinica: 'VetCare Pro',
                nombreClinica: 'VetCare Pro',
                error: mensajeCredencialesInvalidas
            });
        }

        // Guardamos solo datos no sensibles en la sesión (nunca el hash)
        req.session.usuario = {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email
        };

        registrarActividad(`✔️🔐 LOGIN ÉXITO: Sesión iniciada para "${usuario.nombre}" (${usuario.email}).`);
        res.redirect('/');

    } catch (error) {
        await client.end().catch(() => {});
        registrarActividad(`❌🔐 LOGIN ERROR CRÍTICO: ${error.message}`);
        console.error('Error en login:', error);
        res.status(500).send('Error al iniciar sesión');
    }
});

// POST /autenticacion/logout
router.post('/logout', estaAutenticado, (req, res) => {
    const usuarioNombre = req.session.usuario ? req.session.usuario.nombre : 'Desconocido';

    req.session.destroy((err) => {
        if (err) {
            registrarActividad(`❌🔐 LOGOUT ERROR: Falló el cierre de sesión de "${usuarioNombre}": ${err.message}`);
            console.error('Error destruyendo sesión:', err);
            return res.status(500).send('Error al cerrar sesión');
        }

        res.clearCookie('connect.sid');
        registrarActividad(`✔️🔐 LOGOUT: Sesión finalizada para "${usuarioNombre}".`);
        res.redirect('/autenticacion/login');
    });
});

export default router;
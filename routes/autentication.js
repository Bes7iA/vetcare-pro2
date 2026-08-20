import express from 'express';
import bcrypt from 'bcryptjs';
import { getDbClient } from '../helpers/conexion-bd.js';
import { esInvitado, estaAutenticado } from '../middlewares/auth.js';
import { registrarActividad } from '../helpers/logger.js'; // Importamos el logger

const router = express.Router();

// GET /registro
router.get('/registro', esInvitado, (req, res) => {
    registrarActividad("🌐 GET /registro - El usuario visitó la página de Registro.");
    res.render('registro', {
        titulo: 'Registro de Usuario',
        clinica: 'VetCare Pro',
        nombreClinica: 'VetCare Pro',
        error: null
    });
});

// POST /registro
router.post('/registro', esInvitado, async (req, res) => {
    const { nombre, clave } = req.body;
    const client = getDbClient();

    try {
        registrarActividad(`🔑 REGISTRO: Intentando registrar usuario: "${nombre}"...`);
        await client.connect();

        // Verificar si el usuario ya existe
        const existe = await client.query('SELECT * FROM usuarios WHERE nombre = $1', [nombre]);
        if (existe.rows.length > 0) {
            await client.end();
            registrarActividad(`🔑❌ REGISTRO FALLIDO: El usuario "${nombre}" ya existe.`);
            return res.render('registro', {
                titulo: 'Registro de Usuario',
                clinica: 'VetCare Pro',
                nombreClinica: 'VetCare Pro',
                error: 'El nombre de usuario ya está registrado.'
            });
        }

        // Hashear la contraseña
        const claveHash = await bcrypt.hash(clave, 10);

        // Guardar nuevo usuario
        await client.query(
            'INSERT INTO usuarios (nombre, clave_hash) VALUES ($1, $2)',
            [nombre, claveHash]
        );
        await client.end();

        registrarActividad(`🔑✅ REGISTRO ÉXITO: Usuario "${nombre}" creado correctamente.`);
        res.redirect('/login');
    } catch (error) {
        registrarActividad(`❌🔑 REGISTRO ERROR CRÍTICO: ${error.message}`);
        console.error('Error en registro:', error);
        res.status(500).send('Error al registrar usuario');
    }
});

// GET /login
router.get('/login', esInvitado, (req, res) => {
    registrarActividad("🌐 GET /login - El usuario visitó la página de Iniciar Sesión.");
    res.render('login', {
        titulo: 'Iniciar Sesión',
        clinica: 'VetCare Pro',
        nombreClinica: 'VetCare Pro',
        error: null
    });
});

// POST /login
router.post('/login', esInvitado, async (req, res) => {
    const { nombre, clave } = req.body;
    const client = getDbClient();

    try {
        registrarActividad(`🔐 LOGIN: Intento de inicio de sesión para el usuario "${nombre}"...`);
        await client.connect();

        const resultado = await client.query('SELECT * FROM usuarios WHERE nombre = $1', [nombre]);
        await client.end();

        if (resultado.rows.length === 0) {
            registrarActividad(`🔐❌ LOGIN FALLIDO: Usuario "${nombre}" no existe en la BD.`);
            return res.render('login', {
                titulo: 'Iniciar Sesión',
                clinica: 'VetCare Pro',
                nombreClinica: 'VetCare Pro',
                error: 'Credenciales inválidas.'
            });
        }

        const usuario = resultado.rows[0];
        const esClaveValida = await bcrypt.compare(clave, usuario.clave_hash);

        if (!esClaveValida) {
            registrarActividad(`🔐❌ LOGIN FALLIDO: Contraseña incorrecta para el usuario "${nombre}".`);
            return res.render('login', {
                titulo: 'Iniciar Sesión',
                clinica: 'VetCare Pro',
                nombreClinica: 'VetCare Pro',
                error: 'Credenciales inválidas.'
            });
        }

        // Guardar datos en la sesión
        req.session.usuario = {
            id: usuario.id,
            nombre: usuario.nombre
        };

        registrarActividad(`🔐✅ LOGIN ÉXITO: Sesión iniciada para "${usuario.nombre}" (ID: ${usuario.id}).`);
        res.redirect('/mascotas');
    } catch (error) {
        registrarActividad(`❌🔐 LOGIN ERROR CRÍTICO: ${error.message}`);
        console.error('Error en login:', error);
        res.status(500).send('Error al iniciar sesión');
    }
});

// POST /logout
router.post('/logout', estaAutenticado, (req, res) => {
    const usuarioNombre = req.session.usuario ? req.session.usuario.nombre : 'Desconocido';

    req.session.destroy((err) => {
        if (err) {
            registrarActividad(`❌🚪 LOGOUT ERROR: Falló el cierre de sesión de "${usuarioNombre}": ${err.message}`);
            console.error('Error destruyendo sesión:', err);
            return res.status(500).send('Error al cerrar sesión');
        }

        res.clearCookie('connect.sid');
        registrarActividad(`🚪 LOGOUT: Sesión finalizada para el usuario "${usuarioNombre}".`);
        res.redirect('/login');
    });
});

export default router;
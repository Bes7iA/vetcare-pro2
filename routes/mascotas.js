import express from 'express';
import { estaAutenticado } from '../middlewares/auth.js';
import { getDbClient } from '../helpers/conexion-bd.js';
import { registrarActividad } from "../helpers/logger.js";

const router = express.Router();

// Función auxiliar para obtener el nombre del usuario
function obtenerUsuario(req) {
    if (typeof req.session?.usuario === 'object' && req.session?.usuario !== null) {
        return req.session.usuario.nombre || req.session.usuario.username || 'Admin';
    }
    return req.session?.usuario || 'Admin';
}

// 1. GET /mascotas - Listado general
router.use(estaAutenticado);
router.get('/', async (req, res) => {
    const client = getDbClient();
    try {
        await client.connect();
        const resultado = await client.query('SELECT * FROM mascotas ORDER BY id ASC');
        await client.end();

        // LOG
        const usuario = obtenerUsuario(req);
        registrarActividad(`🐾 MASCOTAS: El usuario '${usuario}' Visito el Registro de mascotas.`);

        res.render('mascotas', {
            titulo: 'Gestión de Mascotas',
            clinica: 'VetCare Pro',
            nombreClinica: 'VetCare Pro',
            mascotas: resultado.rows
        });
    } catch (error) {
        console.error('ERROR DETALLADO:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// 2. GET /mascotas/nueva - Formulario
router.get('/nueva', (req, res) => {
    res.render('mascota-nueva', {
        titulo: 'Registrar Mascota',
        clinica: 'VetCare Pro',
        nombreClinica: 'VetCare Pro'
    });
});

// 3. POST /mascotas/nueva - Procesar el registro
router.post('/nueva', async (req, res) => {
    const { nombre, especie, raza, peso_kg, esterilizado, dueno } = req.body;
    const client = getDbClient();

    try {
        await client.connect();
        const fechaActual = new Date().toISOString().split('T')[0];

        await client.query(
            'INSERT INTO mascotas (nombre, especie, raza, peso_kg, esterilizado, dueno, fecha_ingreso) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
                nombre,
                especie,
                raza || 'Mestizo',
                peso_kg ? parseFloat(peso_kg) : null,
                esterilizado === 'on',
                dueno || 'Sin registrar',
                fechaActual
            ]
        );
        await client.end();

        // LOG
        const usuario = obtenerUsuario(req);
        registrarActividad(`➕ MASCOTAS: El usuario '${usuario}' registró la mascota '${nombre}' (${especie}), Dueño: ${dueno || 'Sin registrar'}.`);

        res.redirect('/mascotas');
    } catch (error) {
        console.error('Error al guardar mascota:', error);
        res.status(500).send('Error al guardar la mascota');
    }
});

// 4. GET /mascotas/eliminar/:id - Eliminar una mascota
router.get('/eliminar/:id', async (req, res) => {
    const { id } = req.params;
    const client = getDbClient();

    try {
        await client.connect();
        await client.query('DELETE FROM mascotas WHERE id = $1', [id]);
        await client.end();

        // LOG
        const usuario = obtenerUsuario(req);
        registrarActividad(`🗑️ MASCOTAS: El usuario '${usuario}' eliminó la mascota con ID ${id}.`);

        res.redirect('/mascotas');
    } catch (error) {
        console.error('Error al eliminar mascota:', error);
        res.status(500).send('Error al eliminar la mascota');
    }
});

// 5. GET /mascotas/editar/:id - Cargar datos en el formulario
router.get('/editar/:id', async (req, res) => {
    const { id } = req.params;
    const client = getDbClient();

    try {
        await client.connect();
        const resultado = await client.query('SELECT * FROM mascotas WHERE id = $1', [id]);
        await client.end();

        if (resultado.rows.length === 0) {
            return res.status(404).send('Mascota no encontrada');
        }

        res.render('mascota-editar', {
            titulo: 'Editar Mascota',
            clinica: 'VetCare Pro',
            nombreClinica: 'VetCare Pro',
            mascota: resultado.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener mascota:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// 6. POST /mascotas/editar/:id - Guardar cambios
router.post('/editar/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, especie, raza, peso_kg, esterilizado, dueno } = req.body;
    const client = getDbClient();

    try {
        await client.connect();

        await client.query(
            'UPDATE mascotas SET nombre = $1, especie = $2, raza = $3, peso_kg = $4, esterilizado = $5, dueno = $6 WHERE id = $7',
            [
                nombre,
                especie,
                raza || 'Mestizo',
                peso_kg ? parseFloat(peso_kg) : null,
                esterilizado === 'on',
                dueno || 'Sin registrar',
                id
            ]
        );
        await client.end();

        // LOG
        const usuario = obtenerUsuario(req);
        registrarActividad(`✏️ MASCOTAS: El usuario '${usuario}' actualizó los datos de la mascota ID ${id} (${nombre}).`);

        res.redirect('/mascotas');
    } catch (error) {
        console.error('Error al actualizar mascota:', error);
        res.status(500).send('Error al actualizar la mascota');
    }
});

export default router;
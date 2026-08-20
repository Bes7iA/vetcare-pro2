import express from 'express';
import { estaAutenticado } from '../middlewares/auth.js';
import { getDbClient } from '../helpers/conexion-bd.js';

const router = express.Router();

// 1. GET /mascotas - Listado general
router.use(estaAutenticado);
router.get('/', async (req, res) => {
    const client = getDbClient();
    try {
        await client.connect();
        const resultado = await client.query('SELECT * FROM mascotas ORDER BY id ASC');
        await client.end();

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

// 2. GET /mascotas/nueva - Formulario (¡SIEMPRE ANTES DE /:id!)
router.get('/nueva', (req, res) => {
    res.render('mascota-nueva', {
        titulo: 'Registrar Mascota',
        clinica: 'VetCare Pro',
        nombreClinica: 'VetCare Pro'
    });
});

// 3. POST /mascotas/nueva - Procesar el registro
router.post('/nueva', async (req, res) => {
    const { nombre, especie, raza, peso_kg, esterilizado } = req.body;
    const client = getDbClient();

    try {
        await client.connect();
        await client.query(
            'INSERT INTO mascotas (nombre, especie, raza, peso_kg, esterilizado) VALUES ($1, $2, $3, $4, $5)',
            [nombre, especie, raza || 'Mestizo', peso_kg ? parseFloat(peso_kg) : null, esterilizado === 'on']
        );
        await client.end();

        res.redirect('/mascotas');
    } catch (error) {
        console.error('Error al guardar mascota:', error);
        res.status(500).send('Error al guardar la mascota');
    }
});

// GET /mascotas/eliminar/:id - Eliminar una mascota
router.get('/eliminar/:id', async (req, res) => {
    const { id } = req.params;
    const client = getDbClient();

    try {
        await client.connect();
        await client.query('DELETE FROM mascotas WHERE id = $1', [id]);
        await client.end();

        res.redirect('/mascotas');
    } catch (error) {
        console.error('Error al eliminar mascota:', error);
        res.status(500).send('Error al eliminar la mascota');
    }
});

// GET /mascotas/editar/:id - Cargar datos en el formulario
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

// POST /mascotas/editar/:id - Guardar cambios en PostgreSQL
router.post('/editar/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, especie, raza, peso_kg, esterilizado } = req.body;
    const client = getDbClient();

    try {
        await client.connect();
        await client.query(
            'UPDATE mascotas SET nombre = $1, especie = $2, raza = $3, peso_kg = $4, esterilizado = $5 WHERE id = $6',
            [nombre, especie, raza || 'Mestizo', peso_kg ? parseFloat(peso_kg) : null, esterilizado === 'on', id]
        );
        await client.end();

        res.redirect('/mascotas');
    } catch (error) {
        console.error('Error al actualizar mascota:', error);
        res.status(500).send('Error al actualizar la mascota');
    }
});

export default router;
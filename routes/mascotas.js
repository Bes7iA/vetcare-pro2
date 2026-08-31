import express from 'express';
import validator from 'validator';
import dayjs from "dayjs";
import 'dayjs/locale/es.js';

import {registrarActividad} from "../helpers/logger.js";
import {estaAutenticado} from "../middlewares/auth.js";
import {getDbClient} from "../helpers/conexion-bd.js";

dayjs.locale("es");

const router = express.Router();
router.use(estaAutenticado);

// =====================================
// Gestión del módulo de mascotas (CRUD)
// =====================================

// Ruta Inicial (/) - GET
// - CRUD: Solamente implementamos el READ (listado de mascotas = SELECT)
router.get('/', async (req, res) => {
    const conexion = getDbClient();
    try {
        registrarActividad(`🌐 GET / - Acceso autorizado a lista de mascotas para ${req.session.usuario.email}.`);

        registrarActividad(`💾 BASE DE DATOS: Conexión a BD PostgreSQL iniciada desde el listado de mascotas exitosamente.`);
        // 1. Iniciar la conexión de forma explícita
        await conexion.connect();

        // 2. Creación de las consultas SQL para extraer las mascotas existentes
        // - CRUD: READ, es decir, ejecutaremos un SELECT
        const querySQL = "SELECT * FROM mascotas ORDER BY id ASC;";
        const resultSQL = await conexion.query(querySQL);

        const listaMascotas = resultSQL.rows.map((mascota) => ({
            // Operador de propagación
            ...mascota,
            fechaIngresoFormateada: dayjs(mascota.fecha_ingreso).format('DD/MM/YYYY')
        }));

        res.render('mascotas', {
            titulo: 'Mis Mascotas | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            listaMascotas: listaMascotas
        });

    } catch (error) {
        registrarActividad(`❌🌐 GET /mascotas - No se pudieron listar las mascotas desde la BD. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos cargar el listado de mascotas por problemas en el servidor en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro',
        });
    } finally {
        registrarActividad(`💾 BASE DE DATOS: Cerrando la conexión a BD PostgreSQL.`);
        await conexion.end();
        registrarActividad(`💾 BASE DE DATOS: Conexión a BD PostgreSQL cerrada exitosamente.`);
    }
});

// Ruta (/mascotas/crear) - GET
// - Mostrar (renderizar) la vista para crear una mascota (mascotas_create.ejs)
router.get('/crear', (req, res) => {
    registrarActividad(`🌐 GET /mascotas/crear - Acceso autorizado a crear una mascota para ${req.session.usuario.email}.`);
    res.render('mascotas_create', {
        titulo: 'Crear Mascota | VetCare Pro',
        nombreClinica: 'VetCare Pro',
    });
});

// Ruta (/mascotas/crear) - POST
// - CRUD: Implementamos el CREATE (insertar una mascota = INSERT)
router.post('/crear', async (req, res) => {
    const conexion = getDbClient();
    try {
        const {nombre, especie, raza, edad, sexo} = req.body;

        if (!nombre || !especie || !raza || !sexo || edad === undefined || edad === '') {
            registrarActividad(`❌🌐 POST /mascotas/crear - ERROR: Datos incompletos en el formulario.`);
            return res.status(400).render('error', {
                message: 'Debes completar todos los campos del formulario de creación de mascotas.',
                error: {status: 400, stack: 'Revisa el formulario y rellena todos los campos.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        const edadNumerica = Number(edad);
        if (!Number.isInteger(edadNumerica) || edadNumerica < 0) {
            registrarActividad(`❌🌐 POST /mascotas/crear - ERROR: Edad inválida.`);
            return res.status(400).render('error', {
                message: 'La edad debe ser numérica y mayor o igual a 0.',
                error: {status: 400, stack: 'Revisa el formulario y rellena todos los campos correctamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        if (!['Macho', 'Hembra'].includes(sexo)) {
            registrarActividad(`❌🌐 POST /mascotas/crear - ERROR: Sexo inválido.`);
            return res.status(400).render('error', {
                message: 'El sexo debe ser Macho o Hembra.',
                error: {status: 400, stack: 'Revisa el formulario y rellena todos los campos correctamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`💾 BASE DE DATOS: Conexión a BD PostgreSQL iniciada desde la creación de mascotas exitosamente.`);
        await conexion.connect();
        const insertSQL = `INSERT INTO mascotas (nombre, especie, raza, edad, sexo)
                           VALUES ($1, $2, $3, $4, $5)`;
        const valores = [
            validator.escape(nombre),
            validator.escape(especie),
            validator.escape(raza),
            edadNumerica,
            sexo
        ];
        await conexion.query(insertSQL, valores);

        registrarActividad(`🌐 POST /mascotas/crear - Éxito, mascota ${nombre} registrada exitosamente en la BD.`);
        res.redirect('/mascotas');

    } catch (error) {
        registrarActividad(`❌🌐 POST /mascotas/crear - No se pudo crear una mascota. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos registrar la mascota por problemas en el servidor en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro',
        });
    } finally {
        registrarActividad(`💾 BASE DE DATOS: Cerrando la conexión a BD PostgreSQL.`);
        await conexion.end();
        registrarActividad(`💾 BASE DE DATOS: Conexión a BD PostgreSQL cerrada exitosamente.`);
    }
});

// Ruta (/mascotas/id/editar) - GET
// - Mostrar (renderizar) la vista para editar una mascota (mascotas_update.ejs)
router.get('/:id/editar', async (req, res) => {
    const conexion = getDbClient();
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`❌🌐 GET /mascotas/id/editar - ERROR: ID inválido.`);
            return res.status(400).render('error', {
                message: 'El ID debe ser número y ser mayor o igual a 0.',
                error: {status: 400, stack: 'Revisa el enlace e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`💾 BASE DE DATOS: Conexión a BD PostgreSQL iniciada desde la edición de mascotas exitosamente.`);
        await conexion.connect();
        const selectSQL = `SELECT *
                           FROM mascotas
                           WHERE id = $1`;
        const resultSQL = await conexion.query(selectSQL, [id]);

        if (resultSQL.rows.length === 0) {
            registrarActividad(`❌🌐 GET /mascotas/id/editar - ERROR: Mascota inexistente.`);
            return res.status(400).render('error', {
                message: 'La mascota con ese ID no existe en la BD.',
                error: {status: 400, stack: 'Verifica el listado de mascotas y reintenta.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`🌐 GET /mascotas/id/editar - Formulario de edición de mascotas solicitado y en proceso de renderizado.`);
        res.render('mascotas_update', {
            titulo: 'Editar Mascota | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            mascota: resultSQL.rows[0],
        });
    } catch (error) {
        registrarActividad(`❌🌐 GET /mascotas/id/editar - No se pudo editar una mascota. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos editar la mascota por problemas en el servidor en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro',
        });
    } finally {
        registrarActividad(`💾 BASE DE DATOS: Cerrando la conexión a BD PostgreSQL.`);
        await conexion.end();
        registrarActividad(`💾 BASE DE DATOS: Conexión a BD PostgreSQL cerrada exitosamente.`);
    }
});

// Ruta (/mascotas/id/editar) - POST
router.post('/:id/editar', async (req, res) => {
    const conexion = getDbClient();
    try {
        const id = Number(req.params.id);
        const { nombre, especie, raza, edad, sexo } = req.body;

        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`❌🌐 POST /mascotas/id/editar - ERROR: ID inválido.`);
            return res.status(400).render('error', {
                message: 'El ID debe ser número y ser mayor o igual a 0.',
                error: {status: 400, stack: 'Revisa el enlace e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        if (!nombre || !especie || !raza || !sexo || edad === undefined || edad === '') {
            registrarActividad(`❌🌐 POST /mascotas/id/editar - ERROR: Datos incompletos en el formulario.`);
            return res.status(400).render('error', {
                message: 'Debes completar todos los campos del formulario de creación de mascotas.',
                error: {status: 400, stack: 'Revisa el formulario y rellena todos los campos.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        const edadNumerica = Number(edad);
        if (!Number.isInteger(edadNumerica) || edadNumerica < 0) {
            registrarActividad(`❌🌐 POST /mascotas/id/editar - ERROR: Edad inválida.`);
            return res.status(400).render('error', {
                message: 'La edad debe ser numérica y mayor o igual a 0.',
                error: {status: 400, stack: 'Revisa el formulario y rellena todos los campos correctamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        if (!['Macho', 'Hembra'].includes(sexo)) {
            registrarActividad(`❌🌐 POST /mascotas/id/editar - ERROR: Sexo inválido.`);
            return res.status(400).render('error', {
                message: 'El sexo debe ser Macho o Hembra.',
                error: {status: 400, stack: 'Revisa el formulario y rellena todos los campos correctamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`💾 BASE DE DATOS: Conexión a BD PostgreSQL iniciada desde la edición de mascotas exitosamente.`);
        await conexion.connect();
        const updateSQL = `UPDATE mascotas SET nombre = $1, especie = $2, raza = $3, edad = $4, sexo = $5 WHERE id = $6;`;
        const values = [
            validator.escape(nombre),
            validator.escape(especie),
            validator.escape(raza),
            edadNumerica,
            sexo,
            id
        ];

        const resultSQL = await conexion.query(updateSQL, values);

        if(resultSQL.rowCount === 0) {
            registrarActividad(`❌🌐 POST /mascotas/id/editar - ERROR: No se pudo editar, la mascota es inexistente.`);
            return res.status(400).render('error', {
                message: 'La mascota con ese ID no existe.',
                error: { status: 400, stack: 'Verifica el listado y reintenta.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`🌐 POST /mascotas/id/editar - ÉXITO: Mascota ${nombre} editada exitosamente en la BD.`);
        res.redirect(`/mascotas`);

    } catch (error) {
        registrarActividad(`❌🌐 POST /mascotas/id/editar - No se pudo editar una mascota. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos editar la mascota por problemas en el servidor en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro',
        });
    } finally {
        registrarActividad(`💾 BASE DE DATOS: Cerrando la conexión a BD PostgreSQL.`);
        await conexion.end();
        registrarActividad(`💾 BASE DE DATOS: Conexión a BD PostgreSQL cerrada exitosamente.`);
    }
});

// Ruta (/mascotas/id/eliminar) - POST
router.post('/:id/eliminar', async (req, res) => {
    const conexion = getDbClient();
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`❌🌐 POST /mascotas/id/eliminar - ERROR: ID inválido.`);
            return res.status(400).render('error', {
                message: 'El ID debe ser número y ser mayor o igual a 0.',
                error: {status: 400, stack: 'Revisa el enlace e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`💾 BASE DE DATOS: Conexión a BD PostgreSQL iniciada desde la eliminación de mascotas exitosamente.`);
        await conexion.connect();
        const deleteSQL = `DELETE FROM mascotas WHERE id = $1`;
        const resultSQL = await conexion.query(deleteSQL, [id]);

        if(resultSQL.rowCount === 0) {
            registrarActividad(`❌🌐 POST /mascotas/id/eliminar - ERROR: No se pudo eliminar, la mascota es inexistente.`);
            return res.status(400).render('error', {
                message: 'La mascota con ese ID no existe.',
                error: { status: 400, stack: 'Verifica el listado y reintenta.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`🌐 POST /mascotas/id/eliminar - ÉXITO: Mascota editada exitosamente en la BD.`);
        res.redirect(`/mascotas`);

    } catch (error) {
        registrarActividad(`❌🌐 POST /mascotas/id/eliminar - No se pudo eliminar una mascota. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos eliminar la mascota por problemas en el servidor en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro',
        });
    } finally {
        registrarActividad(`💾 BASE DE DATOS: Cerrando la conexión a BD PostgreSQL.`);
        await conexion.end();
        registrarActividad(`💾 BASE DE DATOS: Conexión a BD PostgreSQL cerrada exitosamente.`);
    }
});

export default router;
import express from 'express';
import { estaAutenticado } from '../middlewares/auth.js';
import { getDbClient } from '../helpers/conexion-bd.js';
import { registrarActividad } from "../helpers/logger.js";

const router = express.Router();
router.use(estaAutenticado);

// Función auxiliar para obtener el nombre del usuario (se mantiene igual)
function obtenerUsuario(req) {
    if (typeof req.session?.usuario === 'object' && req.session?.usuario !== null) {
        return req.session.usuario.nombre || req.session.usuario.username || 'Admin';
    }
    return req.session?.usuario || 'Admin';
}

// =====================================
// 1. GET /mascotas - Listado general
// =====================================
router.get('/', async (req, res) => {
    const client = getDbClient();
    try {
        await client.connect();
        const resultado = await client.query('SELECT * FROM mascotas ORDER BY id ASC');

        const usuario = obtenerUsuario(req);
        registrarActividad(`✔️🐾 MASCOTAS: El usuario '${usuario}' visitó el registro de mascotas.`);

        res.render('mascotas', {
            titulo: 'Gestión de Mascotas',
            clinica: 'VetCare Pro',
            nombreClinica: 'VetCare Pro',
            mascotas: resultado.rows
        });
    } catch (error) {
        registrarActividad(`❌🐾 MASCOTAS: No se pudo listar mascotas. ERROR: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos cargar el listado de mascotas por problemas en el servidor.',
            error: { status: 500, stack: error.message },
            nombreClinica: 'VetCare Pro'
        });
    } finally {
        await client.end();
    }
});

// =====================================
// 2. GET /mascotas/crear - Formulario
// =====================================
router.get('/crear', (req, res) => {
    res.render('mascotas_create', {
        titulo: 'Registrar Mascota',
        clinica: 'VetCare Pro',
        nombreClinica: 'VetCare Pro'
    });
});

// =====================================
// 3. POST /mascotas/crear - Procesar el registro
// =====================================
router.post('/crear', async (req, res) => {
    const { nombre, especie, raza, peso_kg, esterilizado, dueno, edad, sexo } = req.body;
    const client = getDbClient();

    try {
        // Validación de campos obligatorios
        if (!nombre || !especie || !dueno || edad === undefined || edad === '' || !sexo) {
            registrarActividad(`⚠️🐾 MASCOTAS: Registro rechazado, datos incompletos.`);
            return res.status(400).render('error', {
                message: 'Debes completar todos los campos obligatorios del formulario.',
                error: { status: 400, stack: 'Revisa el formulario e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        const edadNumerica = Number(edad);
        if (!Number.isInteger(edadNumerica) || edadNumerica < 0) {
            registrarActividad(`⚠️🐾 MASCOTAS: Registro rechazado, edad inválida (${edad}).`);
            return res.status(400).render('error', {
                message: 'La edad debe ser un número entero mayor o igual a 0.',
                error: { status: 400, stack: 'Revisa el formulario e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        if (!['Macho', 'Hembra'].includes(sexo)) {
            registrarActividad(`⚠️🐾 MASCOTAS: Registro rechazado, sexo inválido (${sexo}).`);
            return res.status(400).render('error', {
                message: 'El sexo debe ser Macho o Hembra.',
                error: { status: 400, stack: 'Revisa el formulario e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        await client.connect();
        await client.query(
            `INSERT INTO mascotas (nombre, especie, raza, peso_kg, esterilizado, dueno, edad, sexo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                nombre,
                especie,
                raza || 'Mestizo',
                peso_kg ? parseFloat(peso_kg) : null,
                esterilizado === 'on',
                dueno,
                edadNumerica,
                sexo
            ]
        );
        // No mandamos fecha_ingreso: la BD la asigna sola (DEFAULT CURRENT_DATE)

        const usuario = obtenerUsuario(req);
        registrarActividad(`✔️🐾 MASCOTAS: El usuario '${usuario}' registró la mascota '${nombre}' (${especie}), Dueño: ${dueno}.`);

        res.redirect('/mascotas');
    } catch (error) {
        registrarActividad(`❌🐾 MASCOTAS: No se pudo crear la mascota. ERROR: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos registrar la mascota por problemas en el servidor.',
            error: { status: 500, stack: error.message },
            nombreClinica: 'VetCare Pro'
        });
    } finally {
        await client.end();
    }
});

// =====================================
// 4. GET /mascotas/:id/editar - Cargar datos en el formulario
// =====================================
router.get('/:id/editar', async (req, res) => {
    const id = Number(req.params.id);
    const client = getDbClient();

    try {
        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`⚠️🐾 MASCOTAS: Solicitud de edición con ID inválido (${req.params.id}).`);
            return res.status(400).render('error', {
                message: 'El ID debe ser un número válido.',
                error: { status: 400, stack: 'Revisa el enlace e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        await client.connect();
        const resultado = await client.query('SELECT * FROM mascotas WHERE id = $1', [id]);

        if (resultado.rows.length === 0) {
            registrarActividad(`⚠️🐾 MASCOTAS: Intento de editar mascota inexistente (ID ${id}).`);
            return res.status(404).render('error', {
                message: 'La mascota con ese ID no existe en la base de datos.',
                error: { status: 404, stack: 'Verifica el listado de mascotas y reintenta.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        res.render('mascotas_update', {
            titulo: 'Editar Mascota',
            clinica: 'VetCare Pro',
            nombreClinica: 'VetCare Pro',
            mascota: resultado.rows[0]
        });
    } catch (error) {
        registrarActividad(`❌🐾 MASCOTAS: Error al cargar mascota para editar. ERROR: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos cargar los datos de la mascota por problemas en el servidor.',
            error: { status: 500, stack: error.message },
            nombreClinica: 'VetCare Pro'
        });
    } finally {
        await client.end();
    }
});

// =====================================
// 5. POST /mascotas/:id/editar - Guardar cambios
// =====================================
router.post('/:id/editar', async (req, res) => {
    const id = Number(req.params.id);
    const { nombre, especie, raza, peso_kg, esterilizado, dueno, edad, sexo } = req.body;
    const client = getDbClient();

    try {
        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`⚠️🐾 MASCOTAS: Actualización rechazada, ID inválido (${req.params.id}).`);
            return res.status(400).render('error', {
                message: 'El ID debe ser un número válido.',
                error: { status: 400, stack: 'Revisa el enlace e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        if (!nombre || !especie || !dueno || edad === undefined || edad === '' || !sexo) {
            registrarActividad(`⚠️🐾 MASCOTAS: Actualización rechazada, datos incompletos (ID ${id}).`);
            return res.status(400).render('error', {
                message: 'Debes completar todos los campos obligatorios del formulario.',
                error: { status: 400, stack: 'Revisa el formulario e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        const edadNumerica = Number(edad);
        if (!Number.isInteger(edadNumerica) || edadNumerica < 0) {
            registrarActividad(`⚠️🐾 MASCOTAS: Actualización rechazada, edad inválida (${edad}).`);
            return res.status(400).render('error', {
                message: 'La edad debe ser un número entero mayor o igual a 0.',
                error: { status: 400, stack: 'Revisa el formulario e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        if (!['Macho', 'Hembra'].includes(sexo)) {
            registrarActividad(`⚠️🐾 MASCOTAS: Actualización rechazada, sexo inválido (${sexo}).`);
            return res.status(400).render('error', {
                message: 'El sexo debe ser Macho o Hembra.',
                error: { status: 400, stack: 'Revisa el formulario e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        await client.connect();
        const resultado = await client.query(
            `UPDATE mascotas
             SET nombre = $1, especie = $2, raza = $3, peso_kg = $4,
                 esterilizado = $5, dueno = $6, edad = $7, sexo = $8
             WHERE id = $9`,
            [
                nombre,
                especie,
                raza || 'Mestizo',
                peso_kg ? parseFloat(peso_kg) : null,
                esterilizado === 'on',
                dueno,
                edadNumerica,
                sexo,
                id
            ]
        );

        if (resultado.rowCount === 0) {
            registrarActividad(`⚠️🐾 MASCOTAS: Intento de actualizar mascota inexistente (ID ${id}).`);
            return res.status(404).render('error', {
                message: 'La mascota con ese ID no existe en la base de datos.',
                error: { status: 404, stack: 'Verifica el listado de mascotas y reintenta.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        const usuario = obtenerUsuario(req);
        registrarActividad(`✔️🐾 MASCOTAS: El usuario '${usuario}' actualizó los datos de la mascota ID ${id} (${nombre}).`);

        res.redirect('/mascotas');
    } catch (error) {
        registrarActividad(`❌🐾 MASCOTAS: No se pudo actualizar la mascota ID ${id}. ERROR: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos actualizar la mascota por problemas en el servidor.',
            error: { status: 500, stack: error.message },
            nombreClinica: 'VetCare Pro'
        });
    } finally {
        await client.end();
    }
});

// =====================================
// 6. POST /mascotas/:id/eliminar - Eliminar una mascota
// =====================================
router.post('/:id/eliminar', async (req, res) => {
    const id = Number(req.params.id);
    const client = getDbClient();

    try {
        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`⚠️🐾 MASCOTAS: Eliminación rechazada, ID inválido (${req.params.id}).`);
            return res.status(400).render('error', {
                message: 'El ID debe ser un número válido.',
                error: { status: 400, stack: 'Revisa el enlace e intenta nuevamente.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        await client.connect();
        const resultado = await client.query('DELETE FROM mascotas WHERE id = $1', [id]);

        if (resultado.rowCount === 0) {
            registrarActividad(`⚠️🐾 MASCOTAS: Intento de eliminar mascota inexistente (ID ${id}).`);
            return res.status(404).render('error', {
                message: 'La mascota con ese ID no existe en la base de datos.',
                error: { status: 404, stack: 'Verifica el listado de mascotas y reintenta.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        const usuario = obtenerUsuario(req);
        registrarActividad(`✔️🐾 MASCOTAS: El usuario '${usuario}' eliminó la mascota con ID ${id}.`);

        res.redirect('/mascotas');
    } catch (error) {
        registrarActividad(`❌🐾 MASCOTAS: No se pudo eliminar la mascota ID ${id}. ERROR: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos eliminar la mascota por problemas en el servidor.',
            error: { status: 500, stack: error.message },
            nombreClinica: 'VetCare Pro'
        });
    } finally {
        await client.end();
    }
});

export default router;
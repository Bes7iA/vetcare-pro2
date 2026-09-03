import express from 'express';
import validator from 'validator';
import dayjs from "dayjs";
import 'dayjs/locale/es.js';
import Mascota from '../models/mascota.js';
import Dueno from '../models/dueno.js';

import {registrarActividad} from "../helpers/logger.js";
import {estaAutenticado} from "../middlewares/auth.js";

dayjs.locale("es");

const router = express.Router();
router.use(estaAutenticado);

// =====================================
// Gestión del módulo de mascotas (CRUD)
// =====================================

// Ruta Inicial (/) - GET
// - CRUD: Solamente implementamos el READ (listado de mascotas = SELECT)
router.get('/', async (req, res) => {
    try {
        registrarActividad(`🌐 GET / - Acceso autorizado a lista de mascotas para ${req.session.usuario.email}.`);

        // 1. Uso el ORM Sequelize para hacer el SELECT, incluyendo los datos del Dueño asociado
        const mascotas = await Mascota.findAll({
            order: [["id", "ASC"]],
            include: Dueno
        });

        // 2. Transformo el resultado (objetos Mascota) a un arreglo de diccionarios para la vista EJS
        const listaMascotas = mascotas.map((mascota) => {
            const m = mascota.toJSON();
            return {
                id: m.id,
                nombre: m.nombre,
                especie: m.especie,
                raza: m.raza,
                edad: m.edad,
                sexo: m.sexo,
                duenoNombre: m.Dueno.nombre,
                fechaIngresoFormateada: dayjs(m.fechaIngreso).format('DD/MM/YYYY')
            };
        });

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
    }
});

// Ruta (/mascotas/crear) - GET
// - Mostrar (renderizar) la vista para crear una mascota (mascotas_create.ejs)
router.get('/crear', async (req, res) => {
    try {
        registrarActividad(`🌐 GET /mascotas/crear - Acceso autorizado a crear una mascota para ${req.session.usuario.email}.`);

        const duenos = await Dueno.findAll({ order: [["nombre", "ASC"]] });
        const listaDuenos = duenos.map(d => d.toJSON());

        res.render('mascotas_create', {
            titulo: 'Crear Mascota | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            listaDuenos
        });
    } catch (error) {
        registrarActividad(`❌🌐 GET /mascotas/crear - No se pudo cargar el formulario. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos cargar el formulario de creación en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro',
        });
    }
});

// Ruta (/mascotas/crear) - POST
// - CRUD: Implementamos el CREATE (insertar una mascota = INSERT)
router.post('/crear', async (req, res) => {
    try {
        const {nombre, especie, raza, edad, sexo, duenoId} = req.body;

        if (!nombre || !especie || !raza || !sexo || edad === undefined || edad === '' || !duenoId) {
            registrarActividad(`❌🌐 POST /mascotas/crear - ERROR: Datos incompletos en el formulario.`);
            return res.status(400).render('error', {
                message: 'Debes completar todos los campos del formulario, incluyendo el dueño.',
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

        // Validación nueva: confirmar que el dueño elegido existe de verdad en la BD
        const duenoIdNumerico = Number(duenoId);
        const duenoExiste = await Dueno.findByPk(duenoIdNumerico);
        if (!duenoExiste) {
            registrarActividad(`❌🌐 POST /mascotas/crear - ERROR: Dueño seleccionado no existe (ID ${duenoId}).`);
            return res.status(400).render('error', {
                message: 'El dueño seleccionado no es válido.',
                error: {status: 400, stack: 'Verifica el listado de dueños e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        await Mascota.create({
            nombre: validator.escape(nombre),
            especie: validator.escape(especie),
            raza: validator.escape(raza),
            edad: edadNumerica,
            sexo: sexo,
            duenoId: duenoIdNumerico
        });

        registrarActividad(`✔️🌐 POST /mascotas/crear - Éxito, mascota ${nombre} registrada exitosamente en la BD.`);
        res.redirect('/mascotas');

    } catch (error) {
        registrarActividad(`❌🌐 POST /mascotas/crear - No se pudo crear una mascota. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos registrar la mascota por problemas en el servidor en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro',
        });
    }
});

// Ruta (/mascotas/id/editar) - GET
// - Mostrar (renderizar) la vista para editar una mascota (mascotas_update.ejs)
router.get('/:id/editar', async (req, res) => {
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

        const mascota = await Mascota.findByPk(id);

        if (!mascota) {
            registrarActividad(`❌🌐 GET /mascotas/id/editar - ERROR: Mascota inexistente.`);
            return res.status(400).render('error', {
                message: 'La mascota con ese ID no existe en la BD.',
                error: {status: 400, stack: 'Verifica el listado de mascotas y reintenta.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        const duenos = await Dueno.findAll({ order: [["nombre", "ASC"]] });
        const listaDuenos = duenos.map(d => d.toJSON());

        registrarActividad(`🌐 GET /mascotas/id/editar - Formulario de edición de mascotas solicitado y en proceso de renderizado.`);
        res.render('mascotas_update', {
            titulo: 'Editar Mascota | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            mascota: mascota.toJSON(),
            listaDuenos
        });
    } catch (error) {
        registrarActividad(`❌🌐 GET /mascotas/id/editar - No se pudo editar una mascota. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos editar la mascota por problemas en el servidor en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro',
        });
    }
});

// Ruta (/mascotas/id/editar) - POST
router.post('/:id/editar', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nombre, especie, raza, edad, sexo, duenoId } = req.body;

        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`❌🌐 POST /mascotas/id/editar - ERROR: ID inválido.`);
            return res.status(400).render('error', {
                message: 'El ID debe ser número y ser mayor o igual a 0.',
                error: {status: 400, stack: 'Revisa el enlace e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        if (!nombre || !especie || !raza || !sexo || edad === undefined || edad === '' || !duenoId) {
            registrarActividad(`❌🌐 POST /mascotas/id/editar - ERROR: Datos incompletos en el formulario.`);
            return res.status(400).render('error', {
                message: 'Debes completar todos los campos del formulario, incluyendo el dueño.',
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

        // 1. Busco la mascota primero, igual que en el GET
        const mascota = await Mascota.findByPk(id);
        if (!mascota) {
            registrarActividad(`❌🌐 POST /mascotas/id/editar - ERROR: No se pudo editar, la mascota es inexistente.`);
            return res.status(400).render('error', {
                message: 'La mascota con ese ID no existe.',
                error: { status: 400, stack: 'Verifica el listado y reintenta.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        // 2. Confirmo que el dueño elegido existe de verdad (mismo patrón que en crear)
        const duenoIdNumerico = Number(duenoId);
        const duenoExiste = await Dueno.findByPk(duenoIdNumerico);
        if (!duenoExiste) {
            registrarActividad(`❌🌐 POST /mascotas/id/editar - ERROR: Dueño seleccionado no existe (ID ${duenoId}).`);
            return res.status(400).render('error', {
                message: 'El dueño seleccionado no es válido.',
                error: {status: 400, stack: 'Verifica el listado de dueños e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        // 3. Actualizo la instancia ya cargada (en vez de un UPDATE ... WHERE a mano)
        await mascota.update({
            nombre: validator.escape(nombre),
            especie: validator.escape(especie),
            raza: validator.escape(raza),
            edad: edadNumerica,
            sexo: sexo,
            duenoId: duenoIdNumerico
        });

        registrarActividad(`✔️🌐 POST /mascotas/id/editar - ÉXITO: Mascota ${nombre} editada exitosamente en la BD.`);
        res.redirect(`/mascotas`);

    } catch (error) {
        registrarActividad(`❌🌐 POST /mascotas/id/editar - No se pudo editar una mascota. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos editar la mascota por problemas en el servidor en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro',
        });
    }
});

// Ruta (/mascotas/id/eliminar) - POST
router.post('/:id/eliminar', async (req, res) => {
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

        // 1. Busco la mascota primero (mismo patrón de editar)
        const mascota = await Mascota.findByPk(id);

        if (!mascota) {
            registrarActividad(`❌🌐 POST /mascotas/id/eliminar - ERROR: No se pudo eliminar, la mascota es inexistente.`);
            return res.status(400).render('error', {
                message: 'La mascota con ese ID no existe.',
                error: { status: 400, stack: 'Verifica el listado y reintenta.' },
                nombreClinica: 'VetCare Pro'
            });
        }

        // 2. Elimino la instancia ya localizada
        await mascota.destroy();

        registrarActividad(`✔️🌐 POST /mascotas/id/eliminar - ÉXITO: Mascota eliminada exitosamente en la BD.`);
        res.redirect(`/mascotas`);

    } catch (error) {
        registrarActividad(`❌🌐 POST /mascotas/id/eliminar - No se pudo eliminar una mascota. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos eliminar la mascota por problemas en el servidor en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro',
        });
    }
});

export default router;
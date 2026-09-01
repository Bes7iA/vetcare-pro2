import express from "express";
import validator from "validator";
import dayjs from "dayjs";
import "dayjs/locale/es.js";

import { estaAutenticado } from "../middlewares/auth.js";
import { registrarActividad } from "../helpers/logger.js";
import Dueno from "../models/dueno.js";

dayjs.locale("es");

const router = express.Router();
router.use(estaAutenticado);

/*
* CRUD de Dueños
* - Aplicado con el ORM Sequelize
* */

// READ (CRUD) - Ruta de Inicio (/) GET
router.get('/', async (req, res) => {
    try {
        registrarActividad(`🌐 GET / - Acceso autorizado a lista de dueños para ${req.session.usuario.email}.`);

        // 1. Uso el ORM Sequelize (metodo findAll()) para hacer el SELECT a PostgreSQL
        const duenos = await Dueno.findAll({order: [["id", "ASC"]]});

        // 2. Lo que devuelve el ORM Sequelize (findAll()) es un arreglo de objetos (clase Dueno), no me sirve,
        // ya que debo transformarlo a un arreglo de diccionarios (JSON) para enviar a la VISTA EJS
        const listaDuenos = duenos.map((dueno) => {
            const d = dueno.toJSON();
            return {
                id: d.id,
                nombre: d.nombre,
                email: d.email,
                telefono: d.telefono,
                direccion: d.direccion,
                fechaRegistroFormateada: dayjs(d.fechaRegistro).format('DD/MM/YYYY')
            };
        });

        // 3. Envío los datos y renderizo la vista EJS
        res.render('duenos', {
            titulo: 'Dueños | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            listaDuenos
        });
    } catch (error) {
        registrarActividad(`❌🌐 GET /duenos - No se pudieron listar los dueños desde la BD. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos cargar el listado de dueños en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    }
});

// CREATE (CRUD) - Ruta para mostrar formulario de creación de dueños (/crear) GET
router.get('/crear', (req, res) => {
    registrarActividad(`🌐 GET /duenos/crear - Acceso autorizado a crear un dueño para ${req.session.usuario.email}.`);
    res.render('duenos_create', {
        titulo: 'Crear un Dueño | VetCare Pro',
        nombreClinica: 'VetCare Pro',
    });
});

// CREATE (CRUD) - Ruta para guardar la info del formulario de creación de dueños (/crear) POST
router.post('/crear', async (req, res) => {
    try {
        registrarActividad(`🌐 POST /duenos/crear - Acceso autorizado a crear un dueño para ${req.session.usuario.email}.`);
        const {nombre, email, telefono, direccion} = req.body;

        if (!nombre || !telefono || !validator.isEmail(email)) {
            registrarActividad(`❌🌐 POST /duenos/crear - ERROR: Datos incompletos o email inválido.`);
            return res.status(400).render('error', {
                message: 'Debes completar el nombre, un email válido y el teléfono.',
                error: { status: 400, stack: 'Revisa el formulario y rellena correctamente todos los campos'},
                nombreClinica: 'VetCare Pro',
            });
        }

        const nuevoDueno = await Dueno.create({
            nombre: validator.escape(nombre),
            email: email.toLowerCase().trim(),
            telefono: validator.escape(telefono),
            direccion: direccion ? validator.escape(direccion) : null
        });

        registrarActividad(`🌐 POST /duenos/crear - ÉXITO: Dueño ${nuevoDueno.nombre} registrado exitosamente en la BD.`);
        res.redirect('/duenos');

    } catch (error) {
        registrarActividad(`❌🌐 POST /duenos/crear - No se pudo crear un dueño en la BD. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos cargar el listado de dueños en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    }
});

// UPDATE (CRUD) - Ruta para mostrar formulario de edición de dueños (/:id/editar) GET
router.get('/:id/editar', async (req, res) => {
    try {
        registrarActividad(`🌐 GET /duenos/id/editar - Acceso autorizado a editar un dueño para ${req.session.usuario.email}.`);

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`❌🌐 GET /duenos/id/editar - ERROR: ID inválido.`);
            return res.status(400).render('error', {
                message: 'El ID debe ser número y ser mayor o igual a 0.',
                error: {status: 400, stack: 'Revisa el enlace e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        const dueno = await Dueno.findByPk(id);
        if (!dueno) {
            registrarActividad(`❌🌐 GET /duenos/id/editar - ERROR: Dueño inexistente.`);
            return res.status(400).render('error', {
                message: 'El dueño con ese ID no existe.',
                error: {status: 400, stack: 'Verificar el listado de dueños e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        registrarActividad(`🌐 GET /duenos/id/editar - Formulario de edición de dueños solicitado correctamente y en proceso de renderización.`);

        res.render('duenos_update', {
            titulo: 'Editar un Dueño | VetCare Pro',
            nombreClinica: 'VetCare Pro',
            dueno: dueno.toJSON()
        });
    } catch (error) {
        registrarActividad(`❌🌐 GET /duenos/id/editar - No se pudo editar un dueño en la BD. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos mostrar el formulario de edición de dueños en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    }
});

// UPDATE (CRUD) - Ruta para persistir la información del formulario de edición de dueños (/:id/editar) POST
router.post('/:id/editar', async (req, res) => {
    try{
        registrarActividad(`🌐 POST /duenos/id/editar - Acceso autorizado a editar un dueño para ${req.session.usuario.email}.`);

        const id = Number(req.params.id);
        const {nombre, email, telefono, direccion} = req.body;

        if (!nombre || !telefono || !validator.isEmail(email)) {
            registrarActividad(`❌🌐 POST /duenos/crear - ERROR: Datos incompletos o email inválido.`);
            return res.status(400).render('error', {
                message: 'Debes completar el nombre, un email válido y el teléfono.',
                error: { status: 400, stack: 'Revisa el formulario y rellena correctamente todos los campos'},
                nombreClinica: 'VetCare Pro',
            });
        }

        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`❌🌐 POST /duenos/id/editar - ERROR: ID inválido.`);
            return res.status(400).render('error', {
                message: 'El ID debe ser número y ser mayor o igual a 0.',
                error: {status: 400, stack: 'Revisa el enlace e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        const dueno = await Dueno.findByPk(id);
        if (!dueno) {
            registrarActividad(`❌🌐 POST /duenos/id/editar - ERROR: Dueño inexistente.`);
            return res.status(400).render('error', {
                message: 'El dueño con ese ID no existe.',
                error: {status: 400, stack: 'Verificar el listado de dueños e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        await dueno.update({
            nombre: validator.escape(nombre),
            email: email.toLowerCase().trim(),
            telefono: validator.escape(telefono),
            direccion: direccion ? validator.escape(direccion) : null
        });

        registrarActividad(`🌐 POST /duenos/id/editar - ÉXITO: Dueño ${dueno.nombre} editado exitosamente en la BD.`);
        res.redirect('/duenos');

    } catch (error) {
        registrarActividad(`❌🌐 POST /duenos/id/editar - No se pudo editar un dueño en la BD. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos editar el dueño en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    }
});

// DELETE (CRUD) - Ruta para eliminar un dueño de la BD (/:id/eliminar) POST
router.post('/:id/eliminar', async (req, res) => {
    try {
        registrarActividad(`🌐 POST /duenos/id/eliminar - Acceso autorizado a eliminar un dueño para ${req.session.usuario.email}.`);

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 0) {
            registrarActividad(`❌🌐 POST /duenos/id/editar - ERROR: ID inválido.`);
            return res.status(400).render('error', {
                message: 'El ID debe ser número y ser mayor o igual a 0.',
                error: {status: 400, stack: 'Revisa el enlace e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        const dueno = await Dueno.findByPk(id);
        if (!dueno) {
            registrarActividad(`❌🌐 POST /duenos/id/eliminar - ERROR: Dueño inexistente.`);
            return res.status(400).render('error', {
                message: 'El dueño con ese ID no existe.',
                error: {status: 400, stack: 'Verificar el listado de dueños e intenta nuevamente.'},
                nombreClinica: 'VetCare Pro'
            });
        }

        await dueno.destroy();

        registrarActividad(`🌐 POST /duenos/id/eliminar - ÉXITO: Dueño ${dueno.nombre} eliminado exitosamente en la BD.`);
        res.redirect('/duenos');

    } catch (error) {
        registrarActividad(`❌🌐 POST /duenos/id/eliminar - No se pudo eliminar un dueño en la BD. ERROR CRÍTICO: ${error.message}`);
        res.status(500).render('error', {
            message: 'No pudimos eliminar el dueño en este momento.',
            error: {status: 500, stack: error.message},
            nombreClinica: 'VetCare Pro'
        });
    }
});

export default router;
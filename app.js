// Importación de dependencias externas (módulos o librerías) según el éstandar ES6
import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// Importación de archivos de ruteo (locales) según el éstandar ES6
import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";
import autenticacionRouter from "./routes/autenticacion.js";
import mascotasRouter from "./routes/mascotas.js";
import duenosRouter from "./routes/duenos.js";

// Importación de configuración y logger propios del proyecto
import {config} from "./config/config.js";
import {sequelize} from "./config/sequelize.js";
import {registrarActividad} from "./helpers/logger.js";

// Si esta línea llega a ejecutarse, significa que TODOS los imports de arriba
// (incluidos los 4 routers) se cargaron sin lanzar excepciones.
registrarActividad("✅⚙️ SISTEMA: Imports resueltos correctamente. Iniciando construcción de la aplicación Express (app.js).");

// La creación del objeto que levanta el servidor
const app = express();

// Activación del motor de plantillas, o vistas (EJS - Embebed JavaScript)
app.set('views', path.join(import.meta.dirname, 'views'));
app.set('view engine', 'ejs');
registrarActividad("✅⚙️ SISTEMA: Motor de vistas EJS configurado correctamente (carpeta: /views).");

// Configuración de Middlewares globales propios de Express.js
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(import.meta.dirname, 'public')));
registrarActividad("✅⚙️ SISTEMA: Middlewares globales configurados (morgan, json, urlencoded, cookie-parser, estáticos).");

// --- INICIO: Configuración de sesión (express-session + connect-pg-simple) ---
registrarActividad("✅⚙️ SISTEMA: Inicializando el middleware de sesión (express-session + PostgreSQL).");

try {
    const PgSession = connectPgSimple(session);

    app.use(session({
        store: new PgSession({
            conObject: {
                host: config.db.host,
                port: config.db.port,
                user: config.db.user,
                password: config.db.password,
                database: config.db.database,
            },
            tableName: 'session',
            createTableIfMissing: false
        }),
        secret: config.session.secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 2
        }
    }));

    registrarActividad("✅⚙️ SISTEMA: Middleware de sesión configurado exitosamente sobre PostgreSQL.");
} catch (error) {
    // Este catch atrapa errores de CONFIGURACIÓN síncrona (ej: parámetros inválidos).
    // Ojo: NO atrapa fallas de conexión a la BD, esas son asíncronas y ocurrirán
    // recién cuando llegue la primera petición que necesite la sesión.
    registrarActividad(`❌ SISTEMA: ARRANQUE FALLIDO. No se pudo configurar el middleware de sesión. Motivo: ${error.message}`);
    throw error; // Relanzamos: sin sesión funcional, la app no puede operar con seguridad.
}

// Middleware "inyector": copia el usuario de la sesión a res.locals para TODAS las vistas
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    next();
});
// --- FIN: Configuración de sesión ---

// --- INICIO: Configuración del ORM Sequelize ---
registrarActividad("✅⚙️ SISTEMA: Verificando la conexión a PostgreSQL para el ORM Sequelize.");
try{
    await sequelize.authenticate();
    registrarActividad("✅⚙️ SISTEMA: Conexión establecida con éxito para ORM Sequelize y PostgreSQL.");
}catch(error){
    registrarActividad(`❌ SISTEMA: ARRANQUE FALLIDO. No fue posible conectar a PostgreSQL para el ORM Sequelize: ${error.message}`);
}
// --- FIN: Configuración del ORM Sequelize ---

// Acá están las rutas configuradas y existentes de mi proyecto
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/autenticacion', autenticacionRouter);
app.use('/mascotas', mascotasRouter);
app.use('/duenos', duenosRouter);
registrarActividad("✅⚙️ SISTEMA: Rutas principales registradas (/, /users, /autenticacion, /mascotas).");

// Acá se configura el error más común en HTTP = 404 - No encontrado (not found)
app.use((req, res, next) => {
    next(createError(404));
});

// Acá se configura los errores en general
app.use((err, req, res, next) => {
    // Red de seguridad para CUALQUIER error de una petición que nadie más manejó.
    registrarActividad(`❌ ERROR NO CONTROLADO: [${req.method} ${req.originalUrl}] → status ${err.status || 500} - ${err.message}`);

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

registrarActividad("✅⚙️ SISTEMA: Aplicación Express configurada por completo y lista para ser exportada.");

// Exportación por defecto según el estándar ES6
export default app;
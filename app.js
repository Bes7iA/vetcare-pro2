// Importación de dependencias externas (módulos o librerías) según el éstandar ES6
import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { config } from './config/config.js';

// Importación de archivos de ruteo (locales) según el éstandar ES6
import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";
import mascotasRouter from './routes/mascotas.js';
import authRouter from './routes/autentication.js'; // Importamos el router de auth

// La creación del objeto que levanta el servidor
const app = express();

const PgSession = connectPgSimple(session);

// Activación del motor de plantillas, o vistas (EJS - Embebed JavaScript)
app.set('views', path.join(import.meta.dirname, 'views'));
app.set('view engine', 'ejs');

// Configuración de Middlewares globales propios de Express.js
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(import.meta.dirname, 'public')));

// --- MIDDLEWARE DE SESIÓN (DEBE IR ANTES DE LAS RUTAS) ---
app.use(session({
    store: new PgSession({
        conObject: {
            user: config.db.user,
            password: config.db.password,
            host: config.db.host,
            port: config.db.port,
            database: config.db.database
        },
        createTableIfMissing: true // Crea automáticamente la tabla session en PostgreSQL
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 días
}));

// Inyector global para que res.locals.usuario esté disponible en todas las vistas
app.use((req, res, next) => {
    res.locals.usuario = req.session ? req.session.usuario : null;
    res.locals.rutaActual = req.path;
    next();
});

// --- DECLARACIÓN DE RUTAS ---
app.use('/', authRouter); // Rutas de login, registro y logout
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/mascotas', mascotasRouter);

// --- MANEJO DE ERRORES ---
// Error 404
app.use((req, res, next) => {
    next(createError(404));
});

// Manejador general de errores
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500);
    res.render('error');
});

// Exportación por defecto según el estándar ES6
export default app;
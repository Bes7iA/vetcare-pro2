import dotenv from 'dotenv';
import {registrarActividad} from "../helpers/logger.js";

dotenv.config();

registrarActividad("SERVIDOR: cargando variables de entorno desde el archivo.env");

const REQUIRED_ENV_VARS =[
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'EMAIL_USER',
    'EMAI_PASSWORD'
];

REQUIRED_ENV_VARS.forEach((envVar) => {
    if(!process.env[envVar]) {
        console.error
    }
})
-- Tabla para el módulo de dueños
CREATE TABLE IF NOT EXISTS duenos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    telefono        VARCHAR(20)  NOT NULL,
    direccion       VARCHAR(255),
    fecha_registro  DATE         NOT NULL DEFAULT CURRENT_DATE
    );
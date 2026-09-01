-- Tabla para almacenar las consultas del formulario de contacto
CREATE TABLE IF NOT EXISTS consultas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    consulta TEXT NOT NULL,
    fecha TIMESTAMP NOT NULL
);

-- Tabla para creación de usuarios (módulo de autenticación)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(60) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Registro inicial para iniciar sesión con admin@gmail.com y clave admin123 (encriptada)
INSERT INTO usuarios (nombre, email, password_hash)
VALUES (
           'Administrador',
           'admin@gmail.com',
           '$2b$10$MIFIa//Ww3IzhOyzUqC4ZO8PNTmzJ3WOpYwZuttdexkkBQ3uT3N6i'
       );

-- Tabla para almacenar las sessiones HTTP
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
) WITH (OIDS=FALSE);
ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session ("expire");

-- Tabla para el módulo de mascotas
CREATE TABLE IF NOT EXISTS mascotas (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    especie        VARCHAR(50)  NOT NULL,
    raza           VARCHAR(100) NOT NULL,
    edad           INTEGER      NOT NULL CHECK (edad >= 0),
    sexo           VARCHAR(10)  NOT NULL CHECK (sexo IN ('Macho', 'Hembra')),
    fecha_ingreso  DATE         NOT NULL DEFAULT CURRENT_DATE
);
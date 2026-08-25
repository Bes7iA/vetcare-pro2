// Verifica si el usuario está logueado para proteger rutas
export const estaAutenticado = (req, res, next) => {
    if (req.session.usuario) {
        return next();
    }
    res.redirect('/autenticacion/login');
};

// Evita que un usuario ya logueado vuelva a ver las pantallas de login/registro
export const esInvitado = (req, res, next) => {
    if (!req.session.usuario) {
        return next();
    }
    res.redirect('/mascotas');
};
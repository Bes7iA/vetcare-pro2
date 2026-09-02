import { Model, DataTypes } from 'sequelize';
import { sequelize } from "../config/sequelize.js";
import Dueno from './dueno.js';

class Mascota extends Model {}

Mascota.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        edad: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        nombre: {
            type: DataTypes.STRING,
            allowNull: false
        },

        especie: {
            type: DataTypes.STRING,
            allowNull: false
        },

        raza: {
            type: DataTypes.STRING,
            allowNull: false
        },

        sexo: {
            type: DataTypes.STRING,
            allowNull: false
        },

        fechaIngreso: {
            type: DataTypes.DATEONLY,
            field: 'fecha_ingreso',
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_DATE'),
        },

        duenoId: {
            type: DataTypes.INTEGER,
            field: 'dueno_id',
            allowNull: false
        }

    }, {
        sequelize,
        modelName: 'Mascota',
        tableName: 'mascotas',
        timestamps: false
    }
);

Dueno.hasMany(Mascota, { foreignKey: 'duenoId' });
Mascota.belongsTo(Dueno, { foreignKey: 'duenoId' });

export default Mascota;
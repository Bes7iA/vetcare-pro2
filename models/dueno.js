import { Model, DataTypes } from 'sequelize';
import { sequelize } from "../config/sequelize.js";

class Dueno extends Model {}

Dueno.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.STRING(150),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true
        },
        telefono: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        direccion: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        fechaRegistro: {
            type: DataTypes.DATEONLY,
            field: 'fecha_registro',
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_DATE'),
        }
    }, {
        sequelize,
        modelName: 'Dueno',
        tableName: 'duenos',
        timestamps: false
    }
);

export default Dueno;
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    fecha_nacimiento: {
        type: Date,
        required: true
    },
    edad: {
        type: Number,
        required: true
    },
    num_control: {
        type: String,
        required: true,
        unique: true // Esto evita que se registren dos veces con el mismo número
    },
    password: {
        type: String,
        required: true
    },
    // Respuestas del cuestionario de gustos/personalidad
    cuestionario: {
        genero: String,
        busca: String,
        hobbies: [String],
        personalidad: [String],
        musica: [String],
        vibe: String,
        random: [String],
        descripcion_libre: String
    },
    // Aquí guardaremos después las respuestas de su cuestionario para Gemini Pro
    perfil_ia: {
        genero: String,
        busca: String,
        descripcion_libre: String,
        gustos_ia: String
    },
    cuestionario_completado: {
        type: Boolean,
        default: false
    },
    matches_sugeridos: [String] // Lista de números de control con los que hizo match
});

module.exports = mongoose.model('User', UserSchema);
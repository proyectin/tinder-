require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// 1. Importamos el "molde" de tu usuario
const User = require('../models/user');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Conexión a la Base de Datos
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🍃 ¡Conectado exitosamente a MongoDB Atlas!'))
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// 2. Ruta para recibir los datos del registro
app.post('/api/registro', async (req, res) => {
    try {
        // Creamos un nuevo usuario con los datos que manda tu formulario
        const nuevoUsuario = new User({
            nombre: req.body.nombre,
            fecha_nacimiento: req.body.fecha_nacimiento,
            edad: req.body.edad,
            num_control: req.body.num_control,
            password: req.body.password
        });

        // Lo guardamos en la base de datos
        await nuevoUsuario.save();
        res.status(201).json({ mensaje: '¡Usuario registrado con éxito!' });

    } catch (error) {
        // Si el error es 11000, significa que alguien ya usó ese número de control (Anti-trampas)
        if (error.code === 11000) {
            res.status(400).json({ error: 'Ese número de control ya está registrado.' });
        } else {
            res.status(500).json({ error: 'Error al registrar usuario.' });
        }
    }
});

// 3. Ruta para recibir las respuestas del cuestionario
app.post('/api/cuestionario', async (req, res) => {
    try {
        const { num_control, respuestas } = req.body;

        // Buscamos al usuario por su número de control y actualizamos su documento
        const usuario = await User.findOneAndUpdate(
            { num_control: num_control },
            {
                cuestionario: {
                    genero: respuestas.genero,
                    busca: respuestas.busca,
                    hobbies: respuestas.hobbies,
                    personalidad: respuestas.personalidad,
                    musica: respuestas.musica,
                    vibe: respuestas.vibe,
                    random: respuestas.random,
                    descripcion_libre: respuestas.descripcion_libre
                },
                cuestionario_completado: true
            },
            { new: true } // Devuelve el documento ya actualizado
        );

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado. ¿Ya te registraste?' });
        }

        res.status(200).json({ mensaje: '¡Cuestionario guardado con éxito!', usuario: usuario.nombre });

    } catch (error) {
        console.error('Error al guardar cuestionario:', error);
        res.status(500).json({ error: 'Error al guardar el cuestionario.' });
    }
});

// 4. Ruta para obtener matches en tiempo real
app.get('/api/posibles-matches', async (req, res) => {
    try {
        const { num_control } = req.query;
        if (!num_control) return res.status(400).json({ error: 'Falta num_control' });

        const usuarioActual = await User.findOne({ num_control });
        if (!usuarioActual) return res.status(404).json({ error: 'Usuario no encontrado' });
        
        // Buscar a todos los demás usuarios que ya terminaron el cuestionario
        const todosUsuarios = await User.find({ num_control: { $ne: num_control }, cuestionario_completado: true });

        const calcArrMatch = (arr1, arr2) => {
            if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return 0;
            const intersection = arr1.filter(x => arr2.includes(x));
            return intersection.length / Math.max(arr1.length, arr2.length);
        };

        const matches = todosUsuarios.map(otro => {
            const c1 = usuarioActual.cuestionario || {};
            const c2 = otro.cuestionario || {};

            let score = 0;
            // Evaluamos las 7 categorías (aprox 14.28% c/u)
            if (c1.genero && c1.genero === c2.genero) score += 14.3;
            if (c1.busca && c1.busca === c2.busca) score += 14.3;
            if (c1.vibe && c1.vibe === c2.vibe) score += 14.3;
            
            score += calcArrMatch(c1.hobbies, c2.hobbies) * 14.3;
            score += calcArrMatch(c1.personalidad, c2.personalidad) * 14.3;
            score += calcArrMatch(c1.musica, c2.musica) * 14.3;
            score += calcArrMatch(c1.random, c2.random) * 14.2;

            let compatibilidad = Math.min(100, Math.round(score));

            return {
                nombre: otro.nombre,
                num_control: otro.num_control,
                edad: otro.edad,
                hobbies: c2.hobbies,
                personalidad: c2.personalidad,
                vibe: c2.vibe,
                compatibilidad
            };
        });

        // Ordenar del mejor match al peor
        matches.sort((a, b) => b.compatibilidad - a.compatibilidad);

        res.status(200).json(matches);
    } catch (error) {
        console.error('Error al calcular matches:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 5. Ruta para generar el rompehielo con Gemini
app.post('/api/icebreaker', async (req, res) => {
    try {
        const { mi_num_control, match_num_control } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Falta configurar la API KEY de Gemini en el archivo .env' });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const yo = await User.findOne({ num_control: mi_num_control });
        const match = await User.findOne({ num_control: match_num_control });

        if (!yo || !match) return res.status(404).json({ error: 'Usuarios no encontrados' });

        const prompt = `
            Actúa como un experto cupido y amigo divertido (estilo app de citas).
            Tu objetivo es crear UN SOLO "icebreaker" (mensaje para romper el hielo) creativo y corto (máximo 2 oraciones cortas)
            para que "${yo.nombre}" le envíe a "${match.nombre}".
            
            Gustos de ${yo.nombre}:
            - Hobbies: ${yo.cuestionario?.hobbies?.join(', ')}
            - Personalidad: ${yo.cuestionario?.personalidad?.join(', ')}
            - Vibe: ${yo.cuestionario?.vibe}
            - Random: ${yo.cuestionario?.random?.join(', ')}
            
            Gustos de ${match.nombre}:
            - Hobbies: ${match.cuestionario?.hobbies?.join(', ')}
            - Personalidad: ${match.cuestionario?.personalidad?.join(', ')}
            - Vibe: ${match.cuestionario?.vibe}
            - Random: ${match.cuestionario?.random?.join(', ')}

            Instrucciones clave:
            - Usa un tono amigable, coqueto pero súper casual y seguro. Usa algunos emojis sutiles.
            - Encuentra algo en común o algo interesante que contraste para iniciar la plática (lee bien sus gustos).
            - Habla en español de México (chido, rolitas, etc).
            - Devuelve SOLO el mensaje exacto que ${yo.nombre} debería copiar y pegar para enviarle a ${match.nombre}, sin comillas ni introducciones. No saludes con "Hola", ve directo a la frase ganadora o un saludo creativo.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
        });
        
        const textoIcebreaker = response.text;

        res.status(200).json({ icebreaker: textoIcebreaker });
    } catch (error) {
        console.error('Error con Gemini:', error);
        res.status(500).json({ error: 'Error al generar el rompehielo' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 ¡Servidor encendido en http://localhost:${PORT}!`);
});
// ============================================
// CUESTIONARIO.JS - Lógica del cuestionario
// ============================================

const totalPreguntas = 8;
let preguntaActual = 1;

// --- Navegación entre preguntas ---

function siguientePregunta(numero) {
    // Validar que se haya respondido la pregunta actual antes de avanzar
    if (!validarPregunta(preguntaActual)) return;

    const actual = document.getElementById(`pregunta-${preguntaActual}`);
    const siguiente = document.getElementById(`pregunta-${numero}`);

    // Animación de salida
    actual.classList.add('saliendo');
    actual.classList.remove('activa');

    setTimeout(() => {
        actual.classList.remove('saliendo');
        siguiente.classList.add('activa', 'entrando');
        preguntaActual = numero;
        actualizarProgreso();

        setTimeout(() => {
            siguiente.classList.remove('entrando');
        }, 500);
    }, 400);
}

function anteriorPregunta(numero) {
    const actual = document.getElementById(`pregunta-${preguntaActual}`);
    const anterior = document.getElementById(`pregunta-${numero}`);

    actual.classList.add('saliendo-derecha');
    actual.classList.remove('activa');

    setTimeout(() => {
        actual.classList.remove('saliendo-derecha');
        anterior.classList.add('activa', 'entrando-izquierda');
        preguntaActual = numero;
        actualizarProgreso();

        setTimeout(() => {
            anterior.classList.remove('entrando-izquierda');
        }, 500);
    }, 400);
}

function actualizarProgreso() {
    const porcentaje = (preguntaActual / totalPreguntas) * 100;
    document.getElementById('progress-fill').style.width = porcentaje + '%';
    document.getElementById('progress-text').textContent = `Pregunta ${preguntaActual} de ${totalPreguntas}`;
}

function validarPregunta(num) {
    if (num === 1) {
        const genero = document.querySelector('input[name="genero"]:checked');
        if (!genero) {
            sacudirPregunta(num);
            return false;
        }
    } else if (num === 2) {
        const busca = document.querySelector('input[name="busca"]:checked');
        if (!busca) {
            sacudirPregunta(num);
            return false;
        }
    } else if (num === 3) {
        const hobbies = document.querySelectorAll('input[name="hobbies"]:checked');
        if (hobbies.length === 0) {
            sacudirPregunta(num);
            return false;
        }
    } else if (num === 4) {
        const personalidad = document.querySelectorAll('input[name="personalidad"]:checked');
        if (personalidad.length === 0) {
            sacudirPregunta(num);
            return false;
        }
    } else if (num === 5) {
        const musica = document.querySelectorAll('input[name="musica"]:checked');
        if (musica.length === 0) {
            sacudirPregunta(num);
            return false;
        }
    } else if (num === 6) {
        const vibe = document.querySelector('input[name="vibe"]:checked');
        if (!vibe) {
            sacudirPregunta(num);
            return false;
        }
    } else if (num === 7) {
        const random = document.querySelectorAll('input[name="random"]:checked');
        if (random.length === 0) {
            sacudirPregunta(num);
            return false;
        }
    }
    return true;
}

function sacudirPregunta(num) {
    const pregunta = document.getElementById(`pregunta-${num}`);
    pregunta.classList.add('shake');
    setTimeout(() => pregunta.classList.remove('shake'), 600);
}

// --- Contador de caracteres para la descripción libre ---
const textarea = document.getElementById('descripcion_libre');
if (textarea) {
    textarea.addEventListener('input', () => {
        document.getElementById('char-count').textContent = textarea.value.length;
    });
}

// --- Envío del cuestionario ---
document.getElementById('form-cuestionario').addEventListener('submit', async function (evento) {
    evento.preventDefault();

    // Validar última pregunta
    const descripcion = document.getElementById('descripcion_libre').value.trim();
    if (!descripcion) {
        sacudirPregunta(8);
        return;
    }

    // Recopilar todas las respuestas
    const genero = document.querySelector('input[name="genero"]:checked')?.value;
    const busca = document.querySelector('input[name="busca"]:checked')?.value;
    const hobbiesChecked = document.querySelectorAll('input[name="hobbies"]:checked');
    const hobbies = Array.from(hobbiesChecked).map(cb => cb.value);
    const personalidadChecked = document.querySelectorAll('input[name="personalidad"]:checked');
    const personalidad = Array.from(personalidadChecked).map(cb => cb.value);

    const musicaChecked = document.querySelectorAll('input[name="musica"]:checked');
    const musica = Array.from(musicaChecked).map(cb => cb.value);

    const vibe = document.querySelector('input[name="vibe"]:checked')?.value;

    const randomChecked = document.querySelectorAll('input[name="random"]:checked');
    const random = Array.from(randomChecked).map(cb => cb.value);

    // Obtener el número de control del localStorage (el "Pase VIP")
    const numControl = localStorage.getItem('usuarioVIP');
    if (!numControl) {
        alert('❌ No encontramos tu sesión. Regístrate primero.');
        window.location.href = '/';
        return;
    }

    // Enviar al servidor
    try {
        const respuesta = await fetch('/api/cuestionario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                num_control: numControl,
                respuestas: {
                    genero,
                    busca,
                    hobbies,
                    personalidad,
                    musica,
                    vibe,
                    random,
                    descripcion_libre: descripcion
                }
            })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            // Mostrar pantalla de éxito
            document.querySelector('.cyber-card').innerHTML = `
                <div class="exito-screen">
                    <div class="check-animado">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h1>¡Listo! <i class="fas fa-fire"></i></h1>
                    <p>Tu perfil está completo. La IA ya está buscando tu match perfecto...</p>
                </div>
            `;
            setTimeout(() => {
                window.location.href = '/matches.html';
            }, 2000);
        } else {
            alert('❌ Error: ' + datos.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un problema de conexión con el servidor.');
    }
});

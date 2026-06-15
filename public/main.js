document.getElementById('form-registro').addEventListener('submit', async function (evento) {
    evento.preventDefault();

    // 1. Obtenemos lo que el usuario escribió
    const nombre = document.getElementById('nombre').value;
    const fecha_nac = document.getElementById('fecha_nac').value;
    const num_control = document.getElementById('num_control').value;
    const password = document.getElementById('password').value;

    // 2. Calculamos la edad
    const fechaNacimiento = new Date(fecha_nac);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const mes = hoy.getMonth() - fechaNacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
        edad--;
    }

    // 3. Enviamos el paquete de datos al servidor
    try {
        const respuesta = await fetch('/api/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre: nombre,
                fecha_nacimiento: fecha_nac,
                edad: edad,
                num_control: num_control,
                password: password
            })
        });

        const datos = await respuesta.json();

        // 4. Revisamos si el servidor nos dio luz verde o hubo un error
        if (respuesta.ok) {
            alert('🎉 ' + datos.mensaje);

            // Le damos su "Pase VIP" guardando su número de control en la memoria de su navegador
            localStorage.setItem('usuarioVIP', num_control);

            // Lo mandamos automáticamente a la pantalla principal de la app
            window.location.href = '/app.html';

        } else {
            alert('❌ Error: ' + datos.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un problema de conexión con el servidor.');
    }
});
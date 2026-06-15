document.addEventListener('DOMContentLoaded', async () => {
    const numControl = localStorage.getItem('usuarioVIP');
    
    if (!numControl) {
        alert('❌ No encontramos tu sesión. Regístrate primero.');
        window.location.href = '/';
        return;
    }

    try {
        const respuesta = await fetch(`/api/posibles-matches?num_control=${numControl}`);
        const matches = await respuesta.json();

        const loader = document.getElementById('loader');
        const contenedor = document.getElementById('contenedor-matches');

        loader.style.display = 'none';
        contenedor.style.display = 'grid';

        if (!respuesta.ok) {
            contenedor.innerHTML = `<h2 style="color:white; width: 100%; text-align: center;">Error: ${matches.error}</h2>`;
            return;
        }

        if (matches.length === 0) {
            contenedor.innerHTML = `
                <div style="width: 100%; text-align: center; color: white; margin-top: 2rem;">
                    <i class="fas fa-ghost" style="font-size: 4rem; color: var(--neon-orange); margin-bottom: 1rem;"></i>
                    <h2>Aún no hay otras personas registradas.</h2>
                    <p style="color: #ccc;">¡Sé el primero en invitar a tus amigos a la app para empezar a hacer match!</p>
                </div>
            `;
            return;
        }

        matches.forEach(match => {
            // Unir algunos gustos para mostrarlos como tags
            let gustos = [];
            if (match.hobbies) gustos.push(...match.hobbies);
            if (match.personalidad) gustos.push(...match.personalidad);
            if (match.musica) gustos.push(...match.musica);
            if (match.random) gustos.push(...match.random);

            // Mostrar un máximo de 6 etiquetas para no saturar la tarjeta
            gustos = gustos.slice(0, 6);
            
            const tagsHTML = gustos.map(g => `<span class="tag">${g}</span>`).join('');

            const tarjeta = document.createElement('div');
            tarjeta.className = 'match-card';
            
            tarjeta.innerHTML = `
                <div class="match-avatar">
                    <i class="fas fa-user-astronaut"></i>
                </div>
                <div class="match-name">${match.nombre}</div>
                <div class="match-age">${match.edad} años</div>
                <div class="match-compatibilidad">
                    <i class="fas fa-fire-alt"></i> ${match.compatibilidad}% Match
                </div>
                <div class="match-tags">
                    ${match.vibe ? `<span class="tag" style="border-color: var(--neon-peach); color: white;"><i class="fas fa-star"></i> ${match.vibe}</span>` : ''}
                    ${tagsHTML}
                </div>
                <button class="cyber-btn btn-mensaje" onclick="generarIcebreaker('${match.num_control}', '${match.nombre}')">
                    <span class="btn-text">Icebreaker con IA ✨</span>
                </button>
            `;
            
            contenedor.appendChild(tarjeta);
        });

    } catch (error) {
        console.error('Error al cargar matches:', error);
        document.getElementById('loader').innerHTML = '<p style="color:white;">Hubo un error de conexión.</p>';
    }
});

// Función para llamar a Gemini y mostrar el modal
window.generarIcebreaker = async function(matchNumControl, matchNombre) {
    const miNumControl = localStorage.getItem('usuarioVIP');
    
    // Crear el modal
    const modalID = 'icebreaker-modal';
    let modal = document.getElementById(modalID);
    if(!modal) {
        modal = document.createElement('div');
        modal.id = modalID;
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.8); backdrop-filter: blur(10px);
            display: flex; align-items: center; justify-content: center; z-index: 1000;
        `;
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="cyber-card" style="width: 90%; max-width: 500px; text-align: center; animation: slideUp 0.3s ease;">
            <i class="fas fa-magic loader" style="font-size: 3rem; margin-top: 0;"></i>
            <h2 style="color: white; margin-top: 1rem;">Gemini está pensando...</h2>
            <p style="color: #ccc;">Analizando la vibra de ${matchNombre} y la tuya para el rompehielo perfecto.</p>
        </div>
    `;
    modal.style.display = 'flex';

    try {
        const res = await fetch('/api/icebreaker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mi_num_control: miNumControl,
                match_num_control: matchNumControl
            })
        });

        const data = await res.json();
        
        if (!res.ok) {
            modal.innerHTML = `
                <div class="cyber-card" style="width: 90%; max-width: 500px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--neon-orange);"></i>
                    <h2 style="color: white; margin-top: 1rem;">Uy, algo falló</h2>
                    <p style="color: #ccc;">${data.error}</p>
                    <button class="cyber-btn" onclick="document.getElementById('${modalID}').style.display='none'" style="margin-top: 2rem;">
                        <span class="btn-text">Cerrar</span>
                    </button>
                </div>
            `;
            return;
        }

        modal.innerHTML = `
            <div class="cyber-card" style="width: 90%; max-width: 500px; text-align: center;">
                <i class="fas fa-fire" style="font-size: 3rem; color: var(--neon-pink);"></i>
                <h2 style="color: white; margin-top: 1rem;">Rompehielo Perfecto</h2>
                <div id="icebreaker-text" style="background: rgba(0,0,0,0.5); padding: 1.5rem; border-radius: 15px; border: 1px solid var(--neon-peach); margin: 1.5rem 0; font-size: 1.2rem; color: #fff; font-weight: 500; font-style: italic;">
                    ${data.icebreaker}
                </div>
                <p style="color: #ccc; margin-bottom: 1.5rem; font-size: 0.9rem;">
                    💡 Cópialo y envíaselo por DM a ${matchNombre}.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button class="cyber-btn" onclick="navigator.clipboard.writeText(document.getElementById('icebreaker-text').innerText); alert('¡Copiado al portapapeles!')">
                        <span class="btn-text"><i class="fas fa-copy"></i> Copiar</span>
                    </button>
                    <button class="cyber-btn" onclick="document.getElementById('${modalID}').style.display='none'">
                        <span class="btn-text">Cerrar</span>
                    </button>
                </div>
            </div>
        `;
    } catch (err) {
        modal.innerHTML = `
            <div class="cyber-card" style="width: 90%; max-width: 500px; text-align: center;">
                <h2 style="color: white;">Error de conexión</h2>
                <button class="cyber-btn" onclick="document.getElementById('${modalID}').style.display='none'" style="margin-top: 2rem;">
                    <span class="btn-text">Cerrar</span>
                </button>
            </div>
        `;
    }
};

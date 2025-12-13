// Lightweight interaction handlers for the landing page
document.addEventListener('DOMContentLoaded', function(){
    // small analytics placeholder + subtle mount animation
    document.querySelectorAll('.card').forEach(card=>{
        card.addEventListener('click', ()=>{
            // future: track navigation
            console.log('Navigate:', card.getAttribute('href'));
        })
    })
    document.documentElement.style.setProperty('--app-ready','1');
})



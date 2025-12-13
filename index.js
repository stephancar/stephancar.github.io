// Lightweight interaction handlers for the landing page
document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.card').forEach(card=>{
        card.addEventListener('click', ()=>{
            console.log('Navigate:', card.getAttribute('href'));
        })
    })
})



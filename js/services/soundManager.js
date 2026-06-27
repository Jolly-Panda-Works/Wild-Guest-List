let _sounds = null;
let _enabled = true;

let _activeSounds = [];
let _bgMusic = null;


async function loadSounds() {

    if (_sounds) return _sounds;

    try {
        const res = await fetch("./data/config.json");
        const cfg = await res.json();

        _sounds = cfg.sounds || {};

    } catch {

        _sounds = {};

    }

    return _sounds;
}


// --------------------
// SFX
// --------------------

export async function playSound(key) {

    if (!_enabled) return;

    const sounds = await loadSounds();
    const src = sounds[key];

    if (!src) return;


    try {

        const audio = new Audio(src);

        audio.volume = 0.5;

        _activeSounds.push(audio);


        audio.play().catch(()=>{});


        audio.onended = () => {

            _activeSounds =
                _activeSounds.filter(a => a !== audio);

        };


    } catch {}

}



// --------------------
// Background Music
// --------------------

export async function playBackgroundMusic() {


    const sounds = await loadSounds();

    const src = sounds.background;

    if (!src) return;


    if (!_bgMusic) {

        _bgMusic = new Audio(src);

        _bgMusic.loop = true;

        _bgMusic.volume = 0.25;

    }


    if (_enabled) {

        _bgMusic.play().catch(()=>{});

    }

}



export function stopBackgroundMusic() {

    if (!_bgMusic) return;

    _bgMusic.pause();

    _bgMusic.currentTime = 0;

}



// --------------------
// Toggle
// --------------------

export function initSoundToggle() {


    const toggle =
        document.getElementById("soundToggle");


    if (!toggle) return;


    _enabled = toggle.checked;



    toggle.addEventListener("change", ()=>{


        _enabled = toggle.checked;



        if (!_enabled) {


            // قطع SFX های فعال
            _activeSounds.forEach(audio=>{

                audio.pause();
                audio.currentTime = 0;

            });


            _activeSounds = [];



            // قطع موزیک
            if (_bgMusic){

                _bgMusic.pause();

            }


        } 
        else {


            // ادامه موزیک
            if (_bgMusic){

                _bgMusic.play().catch(()=>{});

            }


        }


    });


}
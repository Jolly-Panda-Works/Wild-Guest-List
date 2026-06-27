export function openKangarooChoice(maxJump){


    return new Promise((resolve)=>{


        const modal =
            document.getElementById("kangarooModal");


        const one =
            document.getElementById("jumpOneBtn");


        const two =
            document.getElementById("jumpTwoBtn");



        modal.classList.remove("hidden");



        one.style.display = "block";
        two.style.display = "block";



        if(maxJump === 1){

            two.style.display = "none";

        }



        one.onclick = ()=>{

            modal.classList.add("hidden");

            resolve(1);

        };



        two.onclick = ()=>{

            modal.classList.add("hidden");

            resolve(2);

        };


    });

}
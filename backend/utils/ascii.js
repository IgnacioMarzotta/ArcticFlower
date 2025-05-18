const figlet = require("figlet");

//Funcion menor de animacion al iniciar el servidor backend
figlet.text(
    "ArcticFlower",
    {
        font: "Slant",
        horizontalLayout: "default",
        verticalLayout: "default"
    },
    function (err, data) {
        if (err) {
            console.log("Algo salió mal...");
            console.dir(err);
            return;
        }
        console.log(data);
    }
);
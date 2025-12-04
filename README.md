<h1>ArcticFlower</h1>

Ignacio Marzotta Diaz <br>
Proyecto de título <br>
Facultad de Ingeniería, Universidad Andrés Bello

<h2>Introduccion</h2>
 
El cambio climático y la pérdida de biodiversidad son dos de los mayores desafíos que enfrenta la humanidad en el siglo XXI. Según el "Global Assessment Report on Biodiversity and Ecosystem Services" de 2019, alrededor de un millón de especies están en peligro de extinción debido a las actividades humanas como la deforestación, la contaminación y el cambio climático. La necesidad de educar y concienciar al público sobre estos problemas es más urgente que nunca, y las redes sociales están jugando un rol fundamental en cambiar la percepción pública sobre esta crisis, por lo que educarse e informarse es más urgente que nunca.

En este contexto nace ArcticFlower, un proyecto sin fines de lucro diseñado para proporcionar una plataforma interactiva y educativa que informe sobre las especies en peligro de extinción y los impactos del cambio climático. Utilizando tecnologías web modernas y datos de fuentes confiables, ArcticFlower busca no solo informar, sino también inspirar a las personas a tomar acciones concretas para proteger nuestro planeta. El proyecto se centrará en ofrecer una experiencia accesible y atractiva tanto para el público general como para educadores y organizaciones ambientales, destacando la importancia de cada pequeña acción en la lucha contra la pérdida de biodiversidad.

<h2>Demo en producción</h2>

https://arcticflower.onrender.com/

(Puede presentar demoras debido al uso de Render Free Tier.)

<h2>Instrucciones: </h2>
El proyecto corre sobre:
    Angular CLI 19.2.19
    Node.js 22.21.1
    npm 10.9.4

Para ejecutar back-end de Node:
```
cd backend
npm install
npm run dev
```

Para ejecutar front-end de Angular:
```
cd frontend
npm install
ng serve
```

<h2>Características: </h2>

* Catálogo de especies: El software proporcionará un extenso catálogo de especies en peligro de extinción y en riesgo, con información detallada sobre su hábitat, características, amenazas y estado de conservación.

* Exploración interactiva: Los usuarios podrán explorar de manera interactiva mapas geográficos y ecosistemas virtuales para aprender sobre la distribución geográfica de las especies y las amenazas a las que se enfrentan.

* Herramientas de sensibilización: Se incluirán herramientas de sensibilización como vídeos educativos, infografías animadas y juegos interactivos para comunicar de manera efectiva la importancia de la biodiversidad y las acciones que se pueden tomar para su conservación.

* Participación comunitaria: ArcticFlower facilitará la participación comunitaria mediante funciones de reporte de avistamientos de especies, comentarios y contribuciones de contenido por parte de los usuarios, fomentando así la colaboración y el compromiso con la conservación.

* Actualizaciones con datos externos: El software actualiza los detalles de especies y paises desde fuentes cientificas confiables como IUCN y GBIF

<h2>Arquitectura: </h2>

El proyecto tiene una estructura cliente-servidor simple, con el back-end y front-end alojados en un mismo directorio, y separados en la carpeta raiz del proyecto de la siguiente manera.

```
┣ 📂backend
┃ ┣ 📂config
┃ ┃ ┗ Almacena las confiugraciones de deployment a Render y conexion a base de datos.
┃ ┣ 📂controllers
┃ ┃ ┗ Mantiene toda la logica de los controladores de cada uno de los recurso de la aplicacion.
┃ ┣ 📂middlewares
┃ ┃ ┗ Define los middleware de autenticacion, validacion de sesion, y mas.
┃ ┣ 📂missions
┃ ┃ ┗ Guarda cada una de las "templates" de misiones, junto con la logica de completado y validaciones.
┃ ┣ 📂models
┃ ┃ ┗ Almacena cada uno de los modelos de la aplicacion y su definicion en la base de datos
┃ ┣ 📂routes
┃ ┃ ┗ Todas las definiciones de rutas de APIs del back-end.
┃ ┣ 📂services
┃ ┃ ┗ Ubicacion de servicios del back-end, como conexiones a IUCN, GBIF, logica de cuestionario, entre otros.
┃ ┣ 📂tests
┃ ┃ ┗ Define todos los tests (de integracion y unitarios) del backend usando jest.
┃ ┣ 📂utils
┃ ┃ ┗ Guarda diversas utilidades, como el cuestionario actual, y otras funciones deprecadas utilizadas en la creacion del dataset de produccion.
┃ ┣ 📜package.json
┃ ┗ 📜server.js
┣ 📂frontend
┃ ┣ 📂src
┃ ┃ ┣ 📂app
┃ ┃ ┃ ┣ 📂components
┃ ┃ ┃ ┣ 📂core
┃ ┃ ┃ ┣ 📂modules
┃ ┃ ┃ ┣ 📂pages
┃ ┃ ┃ ┃ ┣ 📂home
┃ ┃ ┃ ┃ ┣ 📂map
┃ ┃ ┃ ┃ ┗ 📂profile
┃ ┃ ┣ 📂assets
┃ ┃ ┣ 📂environments
┃ ┣ 📂testing
┣ 📜.gitignore
┣ 📜LICENSE
┣ 📜Marzotta_I_ArcitcFlower_Plataforma_para_la_educacion_ambiental_2025.pdf
┣ 📜package.json
┗ 📜README.md
```



<h2>Roadmap: </h2>

* Omniauth (Google, Apple?, etc).

* Mailer (Password recovery, notifications).

* Profile Picture: Capacidad de cambiar imagen de perfil.

* Recorridos virtuales: Guias tematicas sobre historia de extincion de especies selectas en regiones especificas del planeta. (Ej. Nilo, Amazonas, Patagonia, etc).

* Rachas: Rachas de dias consecutivos con todas las misiones completadas.

* Tabla de puntuaciones: Leaderboard de usuarios segun racha de misiones y nivel.

* Internationalization (English, Spanish, Chinese?, Portuguese?)

* Capas de globo adicionales para mayor variedad de maneras de ver los datos de especies.

* Sistema de amigos: Capacidad de enviar solicitudes de amistad y ver datos de amigos (especies favoritas, racha de misiones, etc).

<h2>FAQ: </h2>

<b>¿Por qué "ArcticFlower"?</b><br>

Viene del termino recientemente popularizado de "The Arctic is blooming", que simboliza un mal presagio sobre el cambio climatico, y que esta produciendo que florezca en regiones articas a niveles acelerados a causa de la actividad humana. Como muestra uno de los informes mas reciente de NOAA Arctic Program (2023), que señala que los "valores más altos de verdor circumpolar" en los registros satelitales (1982–2022) se han dado en los últimos 12 años, lo que sugiere que el proceso de “greening” continúa o incluso se intensifica.

Ante esto aparece "ArcticFlower", la "flor artica", que florece como respuesta a este desafio colosal de intentar traer a la conciencia publica las consecuencias mas indirectas del mismo cambio climatico que esta haciendo que florezca en el artico.

<b>¿Qué hay del dataset? ¿De dónde vienen los datos?</b><br>

En cuanto a los países/territorios, todos siguen el estandar ISO 3166, que abarca cada país, subdivisiones y territorios. 

Para las especies, se usó técnicas de Data Mining para rescatar los atributos relevantes para el proyecto (como nombres científicos y vernaculares, descripciones, medios, ubicaciones geográficas, entre otros) de alrededor de 8 datasets distintos, obtenidos desde IUCN y GBIF sobre todas las especies en categorias CR (Critically Endangered), EW (Extinct in the Wild), EX (Extinct), según el estandar de IUCN sobre Species Status Categorization.
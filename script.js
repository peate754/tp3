var map = L.map('map').setView([46.830106, 0], 5);

var osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

var esriLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
    {
        //attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
);

var trenchLayer = null;
var earthquakeLayer = null;

var controlMaps = {
    "OSM": osmLayer,
    "ESRI": esriLayer
};

L.control.layers(controlMaps).addTo(map);

osmLayer.addTo(map); // Ajout de la couche OSM par défaut

// Fonction pour charger les données et créer la couche de tremblements de terre
function loadEarthquakeLayer() {
    $.getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson', function(data) {
        // Supprimer la couche existante si elle existe déjà
        if (earthquakeLayer !== null) {
            map.removeLayer(earthquakeLayer);
        }

        // Créer la nouvelle couche de tremblements de terre
        earthquakeLayer = L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.marker(latlng, {
                    icon: L.icon({
                        iconUrl: 'icone.png', 
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    })
                });
            }
        });

        // Ajouter la couche à la carte
        earthquakeLayer.addTo(map);
    });
}

// Charger le fichier JSON pour les tranchées et créer la couche
$.getJSON('trench.json', function(data) {
    trenchLayer = L.geoJSON(data, {
        style: function(feature) {
            // Définir les styles en fonction des propriétés de vos entités GeoJSON
            if (feature.properties.datatype === "TH") {
                return {
                    color: 'blue',
                    weight: 3,
                    opacity: 0.8
                };
            } else if (feature.properties.datatype === 'TR') {
                return {
                    color: 'red',
                    weight: 2,
                    opacity: 0.8,
                    fillColor: 'orange',
                    fillOpacity: 0.5
                };
            } else if (feature.properties.datatype === 'RI') {
                return {
                    color: 'green',
                    weight: 2,
                    opacity: 0.8,
                    fillColor: 'green',
                    fillOpacity: 0.5
                };
            } else {
                // Ajoutez une condition pour gérer les autres cas si nécessaire
                return {
                    // Définissez les styles par défaut ici
                };
            }
        }
    });
});

// Ajout du contrôle pour les couches de tranchées et de tremblements de terre
var layerControl = L.control({position: 'bottomleft'});

layerControl.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'layer-control');
    div.innerHTML = '<h4>couche</h4>' +
                    '<input type="checkbox" id="trenchLayerCheckbox" checked> Faille<br>' +
                    '<input type="checkbox" id="earthquakeLayerCheckbox" checked> Tremblement de terre';
    return div;
};

layerControl.addTo(map);

// Ajouter des gestionnaires d'événements pour le contrôle des tranchées et des tremblements de terre
$('#trenchLayerCheckbox').change(function() {
    if (this.checked) {
        trenchLayer.addTo(map);
    } else {
        map.removeLayer(trenchLayer);
    }
});

$('#earthquakeLayerCheckbox').change(function() {
    if (this.checked) {
        loadEarthquakeLayer(); // Charger la couche de tremblements de terre
    } else {
        // Supprimer la couche de tremblements de terre
        if (earthquakeLayer !== null) {
            map.removeLayer(earthquakeLayer);
        }
    }
});

var title = L.control();

title.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'leaflet-control-title');
    div.innerHTML = '<h1>Tremblement de Terre et Ligne de plaque</h1>';
    return div;
};

title.addTo(map);

// Charger le fichier JSON
// Fonction pour créer une étiquette avec la gestion du zoom
function createLabelWithZoomControl(coordinates, labelName) {
    const label = L.marker(coordinates.reverse(), {
        icon: L.divIcon({
            className: 'custom-label',
            html: `<div>${labelName}</div>`
        })
    });

    // Ajouter un gestionnaire d'événements pour afficher/masquer l'étiquette en fonction du niveau de zoom
    label.addTo(map);
    map.on('zoomend', function () {
        if (map.getZoom() < 5) {
            label.getElement().style.color = 'transparent'; // Masquer le texte lorsque le zoom est inférieur à 10
        } else {
            label.getElement().style.color = '#FFA500'; // Afficher le texte en orange lorsque le zoom est supérieur ou égal à 10
        
        }
    });

    return label;
}

// Charger le fichier JSON
fetch('trench.json')
    .then(response => response.json())
    .then(data => {
        const addedLabels = new Set(); // Ensemble pour stocker les noms des étiquettes déjà ajoutées
        data.features.forEach(feature => {
            const labelName = feature.properties.geogdesc;

            // Vérifier si le nom de l'étiquette est déjà ajouté
            if (!addedLabels.has(labelName)) {
                const coordinates = feature.geometry.coordinates;
                const middleIndex = Math.floor(coordinates.length / 2);
                const middlePoint = coordinates[middleIndex];

                // Créer une étiquette avec gestion du zoom
                createLabelWithZoomControl(middlePoint, labelName);

                // Ajouter le nom de l'étiquette à l'ensemble des noms d'étiquettes ajoutées
                addedLabels.add(labelName);
            }
        });
    });

var legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'legend');
    div.innerHTML += '<p><span class="marker-red"></span> Fosse</p>';
    div.innerHTML += '<p><span class="marker-purple"></span> Ligne de chevauchement</p>';
    div.innerHTML += '<p><span class="marker-blue"></span> Dorsale</p>';
    div.innerHTML += '<p><span class="marker-green"></span> Tremblement de terre</p>';
    // Ajoutez d'autres éléments de légende ici

    return div;
};

legend.addTo(map);
L.control.scale().addTo(map);
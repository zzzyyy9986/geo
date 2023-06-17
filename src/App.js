import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw/dist/leaflet.draw-src.css';
import axios from 'axios';
const infrastructureTypes = ["pharmacy", "kindergarten", "school", "restaurant"];

function MapComponent() {

  const DrawnItems = new L.FeatureGroup();
  const map = useMap();
  useEffect(() => {
    DrawnItems.addTo(map);
  }, [map]);

  const handleCreated = async (e) => {
    const layer = e.layer;
    DrawnItems.addLayer(layer);
    const latLngs = layer.getLatLngs()[0];
    // изменено здесь
    const polygon = latLngs.map(latLng => `${latLng.lat} ${latLng.lng}`).join(' ');

    const infrastructureCounts = {};
    for (const type of infrastructureTypes) {
      const count = await fetchInfrastructureInPolygon(polygon, type);
      infrastructureCounts[type] = count;
    }

    console.log(infrastructureCounts);  // выводим результаты в консоль
  }

  return (
    <FeatureGroup>
      <EditControl
        position="topright"
        onCreated={handleCreated}
        draw={{
          rectangle: false,
          polyline: false,
          circle: false,
          circlemarker: false,
          marker: false,
        }}
      />
    </FeatureGroup>
  );
}

async function fetchInfrastructureInPolygon(polygon, infrastructureType) {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const overpassQuery = `
    [out:json];
    (
      node["amenity"="${infrastructureType}"](poly:"${polygon}");
      way["amenity"="${infrastructureType}"](poly:"${polygon}");
      relation["amenity"="${infrastructureType}"](poly:"${polygon}");
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await axios.post(overpassUrl, `data=${encodeURIComponent(overpassQuery)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.elements.length;  // количество объектов этого типа внутри полигона
  } catch (error) {
    console.error('Error fetching data: ', error);
    return null;
  }
}

function MyMap() {
  return (
    <MapContainer center={[55.7522200, 37.6155600]} zoom={13} style={{ height: "100vh", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapComponent />
    </MapContainer>
  );
}

export default MyMap;

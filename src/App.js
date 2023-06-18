import React, { useEffect, useRef, useState } from 'react';

import { MapContainer, TileLayer, useMap, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw/dist/leaflet.draw-src.css';
import axios from 'axios';
import districtsData from './districtsData.json';
import { saveAs } from 'file-saver';


const infrastructureTypes = ["pharmacy", "kindergarten", "school", "restaurant"];

// async function fetchDistrictBoundaries(city) {
//   const overpassUrl = 'https://overpass-api.de/api/interpreter';
//   const overpassQuery = `
//     [out:json];
//     area[name="${city}"];
//     relation[admin_level="9"](area);
//     out geom;
//   `;

//   try {
//     const response = await axios.post(overpassUrl, `data=${encodeURIComponent(overpassQuery)}`, {
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded'
//       }
//     });

//     return response.data;
//   } catch (error) {
//     console.error('Error fetching district data: ', error);
//     return null;
//   }
// }

async function collectDistrictData() {
  try {
    const districts = districtsData.features; // используйте импортированные данные

    const results = {};

    for (const district of districts) {
      const districtName = district.properties.NAME;

      // Обрабатываем MultiPolygon отдельно
      const coordinates = district.geometry.type === "MultiPolygon"
        ? district.geometry.coordinates.flat()
        : district.geometry.coordinates;

      const boundaries = coordinates[0].map(coords => `${coords[1]} ${coords[0]}`).join(' ');

      const infrastructurePromises = infrastructureTypes.map(type => fetchInfrastructureInPolygon(boundaries, type));
      const infrastructureCounts = await axios.all(infrastructurePromises)
        .then(axios.spread((...values) => {
          return infrastructureTypes.reduce((result, type, index) => {
            result[type] = values[index];
            return result;
          }, {});
        }))
        .catch(error => {
          console.error('Error fetching infrastructure: ', error);
          return {};
        });

      results[districtName] = infrastructureCounts;
    }

    return results;
  } catch (error) {
    console.error('Error collecting district data: ', error);
  }
}


async function fetchDistrictData(polygon) {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const overpassQuery = `
    [out:json];
    (
      relation["admin_level"="9"](poly:"${polygon}");
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

    return response.data;
  } catch (error) {
    console.error('Error fetching district data: ', error);
    return null;
  }
}

function MapComponent({ handleCollectGeoData }) {
  const DrawnItems = useRef(new L.FeatureGroup()).current;
  const map = useMap();
  useEffect(() => {
    DrawnItems.addTo(map);
  }, [map, DrawnItems]);

  const handleCreated = async (e) => {
    try {
      const layer = e.layer;
      DrawnItems.addLayer(layer);
      const latLngs = layer.getLatLngs()[0];
      const polygon = latLngs.map(latLng => `${latLng.lat} ${latLng.lng}`).join(' ');

      const infrastructureCounts = {};
      for (const type of infrastructureTypes) {
        try {
          const count = await fetchInfrastructureInPolygon(polygon, type);
          infrastructureCounts[type] = count;
        } catch (error) {
          console.error(`Error fetching infrastructure for ${type}: `, error);
        }
      }

      console.log('Infrastructure Counts:', infrastructureCounts);
    } catch (error) {
      console.error('Error in handleCreated: ', error);
    }
  };

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
          polygon: { shapeOptions: { color: '#00FF00' } }, // Зеленый цвет
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

    return response.data.elements.length;
  } catch (error) {
    console.error(`Error fetching infrastructure for ${infrastructureType}: `, error);
    return null;
  }
}


function MyMap() {
  const [isLoading, setIsLoading] = useState(false); // Используем isLoading для строки состояния
  const DrawnItems = useRef(new L.FeatureGroup()).current;

  const handleCollectGeoData = async () => {
    setIsLoading(true); // Начинаем загрузку
    try {
      const districtData = await collectDistrictData();
      console.log('District Data:', districtData);

      // Добавляем временную метку к имени файла
      const timeStamp = new Date().getTime();
      const blob = new Blob([JSON.stringify(districtData)], {type: "application/json;charset=utf-8"});
      saveAs(blob, `districtData_${timeStamp}.json`); // Сохраняем данные в файл

      // Остальной ваш код...

    } catch (error) {
      console.error('Error collecting district data: ', error);
    }
    setIsLoading(false); // Завершаем загрузку
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: '2', position: 'relative' }}>
        <MapContainer center={[55.7522200, 37.6155600]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapComponent handleCollectGeoData={handleCollectGeoData} />
        </MapContainer>
      </div>
      <div style={{ flex: '1', padding: '10px' }}>
        <button onClick={handleCollectGeoData} style={{ margin: '10px 0' }}>
          Собрать геометрические данные
        </button>
        {isLoading && <p>Загрузка данных...</p>} // строка состояния
      </div>
    </div>
  );
}

export default MyMap;

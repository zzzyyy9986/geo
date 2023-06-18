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
import { getDistance } from 'geolib'; // импортируем функцию для вычисления расстояния
import { Marker, Tooltip } from 'react-leaflet';
const infrastructureIcons = {
  pharmacy: L.divIcon({
    className: 'custom-icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="6" y="3" width="4" height="20"/>
              <rect x="14" y="3" width="4" height="20"/>
              <path d="M16 9L10 5L4 9"/>
            </svg>`,
    iconSize: [24, 24]
  }),
  kindergarten: L.divIcon({
    className: 'custom-icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M16 12L12 16L8 12L12 8L16 12Z"/>
            </svg>`,
    iconSize: [24, 24]
  }),
  school: L.divIcon({
    className: 'custom-icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 9L12 2L2 9L12 16L22 9Z"/>
              <path d="M7 21V13H17V21"/>
              <path d="M7 6L2 9L7 12"/>
            </svg>`,
    iconSize: [24, 24]
  }),
  restaurant: L.divIcon({
    className: 'custom-icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3H19V21H15"/>
              <path d="M10 3H14V21H10"/>
              <path d="M5 3H9V21H5"/>
            </svg>`,
    iconSize: [24, 24]
  }),
};

const infrastructureTypes = ["pharmacy", "kindergarten", "school", "restaurant"];
const centerOfMoscow = { latitude: 55.751244, longitude: 37.618423 }; // координаты центра Москвы


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

      // вычисляем центр района
      const districtCenter = coordinates[0].reduce(
        (center, coords, index, array) => {
          center.latitude += coords[1];
          center.longitude += coords[0];
          if (index === array.length - 1) {
            center.latitude /= array.length;
            center.longitude /= array.length;
          }
          return center;
        },
        { latitude: 0, longitude: 0 }
      );

      // вычисляем расстояние от центра района до центра Москвы
      const distanceToCenter = getDistance(centerOfMoscow, districtCenter);


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

        results[districtName] = { ...infrastructureCounts, distanceToCenter };


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

function MapComponent({ handleCollectGeoData, selectedType }) {


  const [markers, setMarkers] = useState([]);
  const map = useMap();
  const drawnItems = L.featureGroup().addTo(map);

  const DrawnItems = useRef(new L.FeatureGroup()).current;
  const selectedTypeRef = useRef(selectedType);
  useEffect(() => {
    selectedTypeRef.current = selectedType;
  }, [selectedType]);

  const handleCreated = async (e) => {
    const layer = e.layer;
    if (layer instanceof L.Polygon) {
      const center = layer.getBounds().getCenter();
      setMarkers(prev => [...prev, {position: [center.lat, center.lng], type: selectedTypeRef.current}]);
    } else if (layer instanceof L.Marker) {
      const latLng = layer.getLatLng();
      setMarkers(prev => [...prev, {position: [latLng.lat, latLng.lng], type: selectedTypeRef.current}]);
    }
    const { edit } = map.editTools;
    edit._toggleEditing(e.layer);
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
          polygon: { shapeOptions: { color: '#00FF00' } }, // Зеленый цвет
          marker: { icon: infrastructureIcons[selectedType] }, // Задаем иконку для маркера в соответствии с выбранным типом
        }}
      />
       {markers.map((marker, idx) => (
      <Marker
        key={idx}
        position={marker.position}
        icon={infrastructureIcons[marker.type]}
      >
        <Tooltip permanent>
          {marker.type}
        </Tooltip>
      </Marker>
    ))}
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
  const [selectedType, setSelectedType] = useState(infrastructureTypes[0]); // Добавьте эту строку

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
          <MapComponent handleCollectGeoData={handleCollectGeoData} selectedType={selectedType} />

        </MapContainer>
      </div>
      <div style={{ flex: '1', padding: '10px' }}>
      <select onChange={(e) => {
  console.log(e.target.value); // Добавьте эту строку для отладки
  setSelectedType(e.target.value);
}}>
  {infrastructureTypes.map(type => (
    <option key={type} value={type}>{type}</option>
  ))}
</select>
        <button onClick={handleCollectGeoData} style={{ margin: '10px 0' }}>
          Собрать геометрические данные
        </button>
        {isLoading && <p>Загрузка данных...</p>} // строка состояния
      </div>
    </div>
  );
}

export default MyMap;

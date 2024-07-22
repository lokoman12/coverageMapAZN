import * as React from "react";
import { createRoot } from "react-dom/client";
import MapGL, { Layer, Marker, Source } from "react-map-gl";
import * as turf from "@turf/turf";
import { Box, Button, TextField } from "@mui/material";
import axios from "axios";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiZWxpc2VpMTIiLCJhIjoiY2xzYnJjMmF4MDVzNDJrbzRscGx2Mzg1aCJ9.PtMmmeg3ErgxPcOsEg2h5Q";

const initialCenter = [30.281996992887677, 59.79052973571955];
const initialDistance = 100; // расстояние в метрах
const initialBearing = Array.from({ length: 36 }, (_, i) => i * 10); // углы от 0 до 350 с шагом 10

export default function App() {
  const [center, setCenter] = React.useState(initialCenter);
  const [radius, setRadius] = React.useState(100);
  const [height, setHeight] = React.useState(0);
  const [corner, setСorner] = React.useState(10);
  const [bearing, setBearing] = React.useState(initialBearing);
  const [markers, setMarkers] = React.useState([]);
  const [polygon, setPolygon] = React.useState(null);

  const handleInputChange = (event) => {
    const { id, value } = event.target;
    if (id === "lat") {
      setCenter([center[0], parseFloat(value)]);
    } else if (id === "lon") {
      setCenter([parseFloat(value), center[1]]);
    } else if (id === "radius") {
      setRadius(parseFloat(value));
    } else if (id === "height") {
      const newHeight = parseFloat(value);
      setHeight(newHeight);
      try {
        const response = axios
          .get(
            `https://api.open-elevation.com/api/v1/lookup?locations=${center[1]},${center[0]}`
          )
          .then((response) => {
            const elevationAtReceiver = response.data.results[0].elevation;
            setHeight(elevationAtReceiver + newHeight);
          });
      } catch (error) {
        console.error(`Error fetching elevation data: ${error.message}`);
      }
    } else if (id === "corner") {
      setСorner(parseFloat(value));
    }
  };
  const handleCalculate = async () => {
    const newMarkers = [];
    for (let dist = initialDistance; dist <= radius; dist += initialDistance) {
      bearing.forEach((dir) => {
        const marker = turf.destination(center, dist, dir, { units: "meters" })
          .geometry.coordinates;
        newMarkers.push(marker);
      });
    }

    const markerData = [];
    const greenMarkers = [];

    for (let i = 0; i < newMarkers.length; i++) {
      const marker = newMarkers[i];
      try {
        const response = await axios.get(
          `https://api.open-elevation.com/api/v1/lookup?locations=${marker[1]},${marker[0]}`
        );
        const elevationData = {
          coordinates: marker,
          elevation: response.data.results[0].elevation,
        };
        markerData.push(elevationData);
        if (elevationData.elevation <= height) {
          greenMarkers.push(elevationData.coordinates);
        }
        setMarkers([...markerData]);
      } catch (error) {
        console.error(`Error fetching elevation data: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Создаем полигон, если есть хотя бы 4 зеленых маркера
    if (greenMarkers.length >= 4) {
      // Замыкаем полигон, добавляя первую точку в конец
      const closedGreenMarkers = [...greenMarkers, greenMarkers[0]];
      const polygonFeature = turf.polygon([closedGreenMarkers]);
      setPolygon(polygonFeature);
    } else {
      // Если не хватает точек для полигональной формы, сбрасываем полигон
      setPolygon(null);
    }
  };

  return (
    <MapGL
      initialViewState={{
        latitude: center[1],
        longitude: center[0],
        zoom: 10,
      }}
      style={{ width: "100vw", height: "100vh" }}
      mapStyle="mapbox://styles/mapbox/dark-v9"
      mapboxAccessToken={MAPBOX_TOKEN}
    >
      {markers.map((marker, index) => (
        <Marker
          key={index}
          latitude={marker.coordinates[1]}
          longitude={marker.coordinates[0]}
        >
          <div
            style={{
              background: marker.elevation > height ? "red" : "green",
              borderRadius: "50%",
              width: "10px",
              height: "10px",
            }}
          />
        </Marker>
      ))}
      {center && <Marker latitude={center[1]} longitude={center[0]} />}
      {polygon && (
        <Source type="geojson" data={polygon}>
          <Layer
            id="polygon-layer"
            type="fill"
            paint={{
              "fill-color": "#00ff00",
              "fill-opacity": 0.4,
            }}
          />
        </Source>
      )}
      <Box
        sx={{
          zIndex: 999,
          position: "absolute",
          top: 0,
          right: 0,
          width: 500,
          padding: 2,
          bgcolor: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
        }}
      >
        <TextField
          fullWidth
          label="Lat"
          id="lat"
          value={center[1]}
          onChange={handleInputChange}
        />
        <TextField
          fullWidth
          label="Lon"
          id="lon"
          value={center[0]}
          onChange={handleInputChange}
        />
        <TextField
          fullWidth
          label="Радиус (м)"
          id="radius"
          value={radius}
          onChange={handleInputChange}
        />
        <TextField
          fullWidth
          label="Высота (м)"
          id="height"
          value={height}
          onChange={handleInputChange}
        />
        <TextField
          fullWidth
          label="Угол РЛС"
          id="corner"
          value={corner}
          onChange={handleInputChange}
        />
        <Button variant="contained" onClick={handleCalculate}>
          Вычислить
        </Button>
      </Box>
    </MapGL>
  );
}

export function renderToDom(container) {
  createRoot(container).render(<App />);
}

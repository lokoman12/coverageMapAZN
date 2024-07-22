import * as React from "react";
import { createRoot } from "react-dom/client";
import MapGL, { Layer, Marker, Source } from "react-map-gl";
import * as turf from "@turf/turf";
import { Box, Button, TextField, CircularProgress } from "@mui/material";
import axios from "axios";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWxpc2VpMTIiLCJhIjoiY2xzYnJjMmF4MDVzNDJrbzRscGx2Mzg1aCJ9.PtMmmeg3ErgxPcOsEg2h5Q";

const initialCenter = [30.281996992887677, 59.79052973571955];
const initialDistance = 100; // расстояние в метрах
const initialBearing = Array.from({ length: 36 }, (_, i) => i * 10); // углы от 0 до 350 с шагом 10

export default function App() {
  const [center, setCenter] = React.useState(initialCenter);
  const [radius, setRadius] = React.useState(100);
  const [height, setHeight] = React.useState(0);
  const [corner, setCorner] = React.useState(10);
  const [bearing, setBearing] = React.useState(initialBearing);
  const [markers, setMarkers] = React.useState([]);
  const [polygon, setPolygon] = React.useState(null);
  const [circle, setCircle] = React.useState(null); // Добавлено состояние для круга
  const [loading, setLoading] = React.useState(false); // Добавлено состояние для загрузки

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
        axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${center[1]},${center[0]}`)
          .then((response) => {
            const elevationAtReceiver = response.data.results[0].elevation;
            setHeight(elevationAtReceiver + newHeight);
          });
      } catch (error) {
        console.error(`Error fetching elevation data: ${error.message}`);
      }
    } else if (id === "corner") {
      setCorner(parseFloat(value));
    }
  };

  const handleCalculate = async () => {
    setLoading(true); // Устанавливаем состояние загрузки в true
    if (corner >= 0) {
      const radSlepoyZoni = Math.tan(corner * (Math.PI / 180)) * height;
      const circleFeature = turf.circle(center, radSlepoyZoni, { steps: 64, units: 'meters' });
      setCircle(circleFeature);
    }
    const newMarkers = [];
    for (let dir of bearing) {
      let pointAboveHeight = false;
      for (let dist = initialDistance; dist <= radius && !pointAboveHeight; dist += initialDistance) {
        const marker = turf.destination(center, dist, dir, { units: "meters" }).geometry.coordinates;
        try {
          const response = await axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${marker[1]},${marker[0]}`);
          const elevation = response.data.results[0].elevation;
          const markerData = { coordinates: marker, elevation };
          newMarkers.push(markerData);
          if (elevation > height) {
            pointAboveHeight = true;
          }
        } catch (error) {
          console.error(`Error fetching elevation data: ${error.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    setMarkers(newMarkers);

    const greenMarkers = newMarkers.filter(marker => marker.elevation <= height).map(marker => marker.coordinates);

    if (greenMarkers.length >= 4) {
      const closedGreenMarkers = [...greenMarkers, greenMarkers[0]];
      const polygonFeature = turf.polygon([closedGreenMarkers]);
      setPolygon(polygonFeature);
    } else {
      setPolygon(null);
    }

    setLoading(false); // Устанавливаем состояние загрузки в false
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
      {circle && (
        <Source type="geojson" data={circle}>
          <Layer
            id="circle-layer"
            type="fill"
            paint={{
              "fill-color": "#ff0000",
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
        <Button variant="contained" onClick={handleCalculate} disabled={loading}>
          Вычислить
        </Button>
        {loading && <CircularProgress />}
      </Box>
    </MapGL>
  );
}

export function renderToDom(container) {
  createRoot(container).render(<App />);
}
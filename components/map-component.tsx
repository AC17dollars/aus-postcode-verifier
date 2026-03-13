"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  ZoomControl,
  useMap,
  FeatureGroup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DESKTOP_BREAKPOINT_PX = 768;

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = globalThis.matchMedia?.(
      `(min-width: ${DESKTOP_BREAKPOINT_PX}px)`,
    );
    if (!mql) {
      const id = setTimeout(() => setIsDesktop(true), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setIsDesktop(mql.matches), 0);
    const handler = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", handler);
    return () => {
      clearTimeout(id);
      mql.removeEventListener("change", handler);
    };
  }, []);
  return isDesktop;
}

interface Locality {
  id: number;
  location: string;
  postcode: string;
  state: string;
  latitude: number;
  longitude: number;
}

interface MapComponentProps {
  readonly localities: Locality[];
  readonly showOnMobile: boolean;
}

function MapAutoAdjuster({
  localities,
  showOnMobile,
}: {
  localities: Locality[];
  showOnMobile: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (showOnMobile) {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showOnMobile, map]);

  useEffect(() => {
    if (localities.length > 0) {
      const bounds = localities.map(
        (loc) => [loc.latitude, loc.longitude] as [number, number],
      );
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
    } else {
      map.setView([-25.2744, 133.7751], 4);
    }
  }, [localities, map]);

  return null;
}

function isValidPosition(position: [number, number]): boolean {
  const [lat, lng] = position;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

const DivMarker: React.FC<{ position: [number, number]; label?: string }> = ({
  position,
  label,
}) => {
  if (!isValidPosition(position)) return null;
  return (
    <Marker
      position={position}
      icon={
        new (
          globalThis as unknown as { L: typeof import("leaflet") }
        ).L.DivIcon({
          className: "custom-marker",
          html: `<div class="w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-lg"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })
      }
    >
      {label && (
        <Tooltip
          permanent
          direction="top"
          className="custom-tooltip"
          offset={[0, -12]}
          opacity={1}
        >
          {label}
        </Tooltip>
      )}
    </Marker>
  );
};

export function MapComponent({
  localities,
  showOnMobile,
}: Readonly<MapComponentProps>) {
  const isDesktop = useIsDesktop();
  const isPanelVisible = isDesktop || showOnMobile;
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!isPanelVisible) {
      const id = setTimeout(() => setMapReady(false), 0);
      return () => clearTimeout(id);
    }
    const timer = setTimeout(() => setMapReady(true), 150);
    return () => clearTimeout(timer);
  }, [isPanelVisible]);

  const localitiesWithValidCoords = localities.filter((loc) =>
    isValidPosition([loc.latitude, loc.longitude]),
  );

  return (
    <div className="w-full h-full relative z-0 min-h-0">
      {isPanelVisible && mapReady ? (
        <MapContainer
          center={[-25.2744, 133.7751]}
          zoom={4}
          zoomControl={false}
          className="w-full h-full grayscale-[10%]"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains={["a", "b", "c", "d"]}
            maxZoom={20}
          />
          <ZoomControl position="bottomright" />

          <FeatureGroup>
            {localitiesWithValidCoords.map((loc) => (
              <DivMarker
                key={loc.id}
                position={[loc.latitude, loc.longitude]}
                label={loc.location}
              />
            ))}
          </FeatureGroup>

          <MapAutoAdjuster
            localities={localitiesWithValidCoords}
            showOnMobile={showOnMobile}
          />
        </MapContainer>
      ) : null}
    </div>
  );
}

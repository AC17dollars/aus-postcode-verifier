"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MapPin, Truck } from "lucide-react";
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

export interface Locality {
  id: number;
  location: string;
  postcode: string;
  state: string;
  latitude: number;
  longitude: number;
  category: string;
}

function CategoryIcon({
  category,
  size = 14,
  className,
}: Readonly<{
  category: string;
  size?: number;
  className?: string;
}>) {
  const c = (category ?? "").trim().toLowerCase();
  if (c.includes("post office") || c.includes("post office box") || c === "pob")
    return <Mail size={size} className={className} />;
  if (c.includes("delivery area") || c.includes("delivery"))
    return <Truck size={size} className={className} />;
  return <MapPin size={size} className={className} />;
}

function getCategoryLabel(category: string): string {
  const c = (category ?? "").trim();
  if (c) return c;
  return "Other";
}

interface MapComponentProps {
  readonly matchingLocalities: Locality[];
  readonly otherLocalities: Locality[];
  readonly showOnMobile: boolean;
}

function MapAutoAdjuster({
  matchingLocalities,
  otherLocalities,
  showOnMobile,
}: {
  matchingLocalities: Locality[];
  otherLocalities: Locality[];
  showOnMobile: boolean;
}) {
  const map = useMap();
  const localitiesForBounds = useMemo(() => {
    if (matchingLocalities.length > 0) return matchingLocalities;
    return [...matchingLocalities, ...otherLocalities];
  }, [matchingLocalities, otherLocalities]);

  useEffect(() => {
    if (showOnMobile) {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showOnMobile, map]);

  useEffect(() => {
    if (localitiesForBounds.length > 0) {
      const bounds = localitiesForBounds.map(
        (loc) => [loc.latitude, loc.longitude] as [number, number],
      );
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
    } else {
      map.setView([-25.2744, 133.7751], 4);
    }
  }, [localitiesForBounds, map]);

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

const TOOLTIP_ICON_SIZE = 14;

function to4Decimals(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function openGoogleMapsDirections(destLat: number, destLng: number) {
  const lat = to4Decimals(destLat);
  const lng = to4Decimals(destLng);
  const dest = `${lat},${lng}`;
  if (!navigator.geolocation) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${dest}`, "_blank", "noopener,noreferrer");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const origin = `${to4Decimals(pos.coords.latitude)},${to4Decimals(pos.coords.longitude)}`;
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${encodeURIComponent(dest)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    () => {
      window.open(`https://www.google.com/maps?q=${dest}`, "_blank", "noopener,noreferrer");
    },
  );
}

const DivMarker: React.FC<{
  position: [number, number];
  loc: Locality;
  isMatching: boolean;
}> = ({ position, loc, isMatching }) => {
  if (!isValidPosition(position)) return null;
  const color = isMatching ? "#22c55e" : "#f97316";
  const tooltipClass = isMatching
    ? "custom-tooltip custom-tooltip-matching"
    : "custom-tooltip custom-tooltip-other";
  const markerClass = isMatching
    ? "custom-marker custom-marker-matching"
    : "custom-marker custom-marker-other";
  const categoryLabel = getCategoryLabel(loc.category);
  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openGoogleMapsDirections(loc.latitude, loc.longitude);
  };
  return (
    <Marker
      position={position}
      icon={
        new (
          globalThis as unknown as { L: typeof import("leaflet") }
        ).L.DivIcon({
          className: markerClass,
          html: `<div class="w-3 h-3 rounded-full border-2 border-white shadow-lg" style="background-color: ${color}"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })
      }
    >
      <Tooltip
        permanent
        direction="top"
        className={tooltipClass}
        offset={[0, -12]}
        opacity={1}
      >
        <button
          type="button"
          onClick={handleLabelClick}
          className="custom-tooltip-inner custom-tooltip-btn flex flex-col gap-0.5 text-left cursor-pointer hover:opacity-90 transition-opacity w-full"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CategoryIcon
              category={loc.category}
              size={TOOLTIP_ICON_SIZE}
              className="shrink-0 opacity-90"
            />
            <span className="custom-tooltip-name font-bold leading-tight whitespace-nowrap">{loc.location}</span>
          </div>
          <div className="custom-tooltip-sub text-[10px] leading-tight">
            {categoryLabel}
            {loc.postcode ? ` · ${loc.postcode}` : ""}
          </div>
        </button>
      </Tooltip>
    </Marker>
  );
};

export function MapComponent({
  matchingLocalities,
  otherLocalities,
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

  const withValidCoords = (loc: Locality) =>
    isValidPosition([loc.latitude, loc.longitude]);
  const matchingValid = matchingLocalities.filter(withValidCoords);
  const othersValid = otherLocalities.filter(withValidCoords);

  return (
    <div className="w-full h-full relative z-0 min-h-0">
      {isPanelVisible && mapReady ? (
        <MapContainer
          center={[-25.2744, 133.7751]}
          zoom={4}
          maxBounds={[[-90, -Infinity], [90, +Infinity]]}
          maxBoundsViscosity={1}
          zoomControl={false}
          className="w-full h-full"
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
            {matchingValid.map((loc) => (
              <DivMarker
                key={`m-${loc.id}-${loc.latitude}-${loc.longitude}`}
                position={[loc.latitude, loc.longitude]}
                loc={loc}
                isMatching={true}
              />
            ))}
            {othersValid.map((loc) => (
              <DivMarker
                key={`o-${loc.id}-${loc.latitude}-${loc.longitude}`}
                position={[loc.latitude, loc.longitude]}
                loc={loc}
                isMatching={false}
              />
            ))}
          </FeatureGroup>

          <MapAutoAdjuster
            matchingLocalities={matchingValid}
            otherLocalities={othersValid}
            showOnMobile={showOnMobile}
          />
        </MapContainer>
      ) : null}
    </div>
  );
}

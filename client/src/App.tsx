import { useState } from "react";
import { useAuthenticatedWebSocket } from "./hooks/useAuthenticatedWebSocket";
// import "./App.css";

const FALLBACK_POSITION: GeolocationPosition = {
    coords: {
        accuracy: 10,
        heading: 10,
        altitude: 10,
        altitudeAccuracy: 10,
        speed: 10,
        toJSON: () => JSON.stringify({}),
        latitude: 10,
        longitude: 10,
    },
    timestamp: Date.now(),
    toJSON: () => JSON.stringify({}),
};

const wsPort = import.meta.env.PROD ? window.location.port : "8000";
const hostWithoutPort = window.location.host
    .split(window.location.port)[0]
    .slice(0, -1);
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${wsProtocol}//${hostWithoutPort}:${wsPort}`;

export default function App() {
    const [status, setStatus] = useState("");
    const ws = useAuthenticatedWebSocket(wsUrl, {
        onOpen: () => setStatus("Connected & Authenticated"),
        onClose: () => setStatus("Connection closed"),
    });

    const sendLocation = async () => {
        if (!navigator.geolocation) {
            console.log("Geolocation not supported");
            setStatus("Geolocation not supported");
            return;
        }

        const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            }
        ).catch(() => FALLBACK_POSITION);

        console.log(
            "Sending message with position " + JSON.stringify(position)
        );
        ws.send({
            type: "location",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString(),
        });
    };

    return (
        <div className="app">
            <button
                onClick={sendLocation}
                disabled={ws.readyState !== WebSocket.OPEN}
                className="location-button"
            >
                Send Location
            </button>
            <div className="status">{status}</div>
        </div>
    );
}

import WebSocket from "ws";
import { sign } from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";
import { exec } from "child_process";
import { haversineDistance } from "./utils";
import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

console.log(process.env.WEBSOCKET_ENDPOINT);

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_INTERVAL = 5000; // 5 seconds

const SECRET_KEY = decodeBase64(process.env.DAEMON_PRIVATE_KEY || "");
const KEY_PAIR = sign.keyPair.fromSecretKey(SECRET_KEY);

interface Location {
    name: string;
    latitude: number;
    longitude: number;
}

interface LocationCondition {
    location: Location;
    distanceMeters: number;
    type: "within" | "beyond";
}

interface Script {
    path: string;
    args?: string[];
    locations: LocationCondition[];
    maxLocationAge: number;
    pollingInterval: number;
    initialDelay: number;
}

interface Config {
    scripts: Script[];
}

interface LocationUpdate {
    latitude: number;
    longitude: number;
    timestamp: string;
}

const config: Config = JSON.parse(readFileSync("./config.json", "utf-8"));

let lastLocation: LocationUpdate | null = null;
let scriptExecutionIntervals: Map<number, NodeJS.Timeout> = new Map();

function startWS(onClose: () => void) {
    const ws = new WebSocket(`${process.env.WEBSOCKET_ENDPOINT}`);
    let heartbeatInterval: NodeJS.Timeout;

    const startHeartbeat = () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }

        heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "heartbeat" }));
            }
        }, HEARTBEAT_INTERVAL);
    };

    ws.on("open", () => {
        console.log("Registering daemon " + encodeBase64(KEY_PAIR.publicKey));
        const registrationMessage = {
            publicKey: encodeBase64(KEY_PAIR.publicKey),
            timestamp: new Date().toISOString(),
        };

        const messageBytes = new TextEncoder().encode(
            JSON.stringify(registrationMessage)
        );
        const signature = sign.detached(messageBytes, KEY_PAIR.secretKey);

        ws.send(
            JSON.stringify({
                type: "register",
                message: JSON.stringify(registrationMessage),
                signature: encodeBase64(signature),
            })
        );

        startHeartbeat();
    });

    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data.toString());

            // Skip heartbeat messages
            if (message.type === "heartbeat") {
                return;
            }

            // Process location updates
            if (message.type === "location") {
                console.log("Updating location:", JSON.stringify(message));
                lastLocation = message;
                config.scripts.forEach((script) => {
                    const [_should, reason] = shouldExecuteScript(script);
                    console.log(reason);
                });
            }
        } catch (err) {
            console.error("Error processing message:", err);
        }
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        ws.close();
    });

    ws.on("close", () => {
        console.log("WebSocket connection closed");
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
        onClose();
    });

    return ws;
}

function start() {
    getLatestLocation();

    config.scripts.forEach((script, scriptID) => {
        console.log(
            `Scheduling script ${script.path} to start in ${script.initialDelay}ms`
        );
        setTimeout(() => {
            startScriptExecution(script, scriptID);
        }, script.initialDelay);
    });
}

function getLatestLocation() {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
        try {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                ws = startWS(() => {
                    console.log("WebSocket closed, scheduling reconnect");
                    if (reconnectTimeout) {
                        clearTimeout(reconnectTimeout);
                    }
                    reconnectTimeout = setTimeout(connect, RECONNECT_INTERVAL);
                });
            }
        } catch (err) {
            console.error("Error connecting to WebSocket:", err);
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            reconnectTimeout = setTimeout(connect, RECONNECT_INTERVAL);
        }
    };

    connect();

    return () => {
        if (ws) {
            ws.close();
        }
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }
    };
}

function shouldExecuteScript(script: Script): [boolean, string[]] {
    if (!lastLocation) {
        return [true, ["Waiting for initial location data"]];
    }

    const age = Date.now() - new Date(lastLocation.timestamp).getTime();
    if (age > script.maxLocationAge) {
        return [
            true,
            [
                "Location data older than max age:" +
                    age +
                    " vs script max age:" +
                    script.maxLocationAge,
            ],
        ];
    }

    const locationReasons: string[] = [];
    let locationCriteriaMet = false;

    script.locations.forEach((condition) => {
        const distance = haversineDistance(
            lastLocation!.latitude,
            lastLocation!.longitude,
            condition.location.latitude,
            condition.location.longitude
        );

        const conditionMet =
            condition.type === "within"
                ? distance <= condition.distanceMeters
                : distance > condition.distanceMeters;

        locationReasons.push(
            `Condition that user is ${condition.type} ${condition.distanceMeters} metres of ${condition.location.name} is ${conditionMet}`
        );
        locationCriteriaMet = locationCriteriaMet || conditionMet;
    });

    return [locationCriteriaMet, locationReasons];
}

function startScriptTimeout(script: Script, scriptId: number) {
    let timer;
    timer = setTimeout(() => {
        const [should, reason] = shouldExecuteScript(script);
        if (should) {
            executeScript(script, scriptId);
        }
        timer = startScriptTimeout(script, scriptId);
    }, script.pollingInterval);

    return timer;
}

function startScriptExecution(script: Script, scriptId: number) {
    if (scriptExecutionIntervals.has(scriptId)) {
        return; // Already running
    }

    console.log(
        `Starting execution for script ${script.path} every ${script.pollingInterval}ms`
    );
    const interval = startScriptTimeout(script, scriptId);

    scriptExecutionIntervals.set(scriptId, interval);
}

function executeScript(script: Script, scriptId: number) {
    console.log("Executing script " + scriptId);
    exec(
        [script.path, ...(script.args || [])].join(" "),
        (error, stdout, stderr) => {
            if (error) console.error(`Script ${script.path} failed:`, error);
            if (stdout) console.log(`Script ${script.path} output:`, stdout);
            if (stderr) console.error(`Script ${script.path} errors:`, stderr);
        }
    );
}

start();

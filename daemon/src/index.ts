import WebSocket from "ws";
import { sign } from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";
import { exec } from "child_process";
import { haversineDistance } from "./utils";
import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const port = process.env.PORT || 8000;
const CONFIGURED_LAT =
    process.env.CONFIGURED_LAT && parseFloat(process.env.CONFIGURED_LAT);
const CONFIGURED_LON =
    process.env.CONFIGURED_LON && parseFloat(process.env.CONFIGURED_LON);

const AUTHORIZED_LOCATION_PUBLIC_KEY = process.env.CLIENT_PUBLIC_KEY;

const SECRET_KEY = decodeBase64(process.env.DAEMON_PRIVATE_KEY || "");
const KEY_PAIR = sign.keyPair.fromSecretKey(SECRET_KEY);

const SCRIPT_PATH = process.env.SCRIPT_PATH || "./script.sh";
const MAX_DISTANCE = 1000; // meters
const MAX_AGE = 5 * 60 * 1000; // 5 minutes

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

function startWS(onClose: () => void) {
    const ws = new WebSocket(`ws://localhost:${port}`);

    ws.on("message", (data) => {
        const parsed = JSON.parse(data.toString());
        const signature = decodeBase64(parsed.signature);
        const clientPublicKey = parsed.publicKey;
        const messageBytes = new TextEncoder().encode(parsed.message);

        if (
            !AUTHORIZED_LOCATION_PUBLIC_KEY ||
            AUTHORIZED_LOCATION_PUBLIC_KEY !== clientPublicKey
        ) {
            console.log(
                "Received message from unkonwn public key " + clientPublicKey
            );
            return;
        }

        const isValid = sign.detached.verify(
            messageBytes,
            signature,
            decodeBase64(AUTHORIZED_LOCATION_PUBLIC_KEY)
        );

        if (!isValid) {
            ws.close(1008, "Invalid signature");
            return;
        }

        const message = JSON.parse(parsed.message);

        if (message.type === "location") {
            console.log("Updating location " + JSON.stringify(message));
            lastLocation = message;
            config.scripts.forEach((script) => {
                const [_should, reason] = shouldExecuteScript(script);
                console.log(reason);
            });
        }
    });

    ws.on("open", () => {
        console.log("Registering daemon " + encodeBase64(KEY_PAIR.publicKey));

        ws.send(
            JSON.stringify({
                type: "register",
                publicKey: encodeBase64(KEY_PAIR.publicKey),
            })
        );
    });

    ws.on("close", () => {
        onClose();
    });

    return ws;
}

function start() {
    actOnLatestLocation();
    getLatestLocation();
}

function getLatestLocation() {
    let ws: WebSocket;

    setInterval(() => {
        try {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                ws = startWS(() => {
                    console.log("Web socket closed");
                });
            }
        } catch (err) {
            console.error(err);
        }
    }, 5000);
}

function shouldExecuteScript(script: Script): [boolean, string[]] {
    if (!lastLocation) {
        return [true, ["Client has never sent latitude or longitude"]];
    }

    const age = Date.now() - new Date(lastLocation.timestamp).getTime();
    if (age > script.maxLocationAge) {
        return [
            true,
            [
                "The age was older than max age:" +
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

function actOnLatestLocation() {
    setInterval(() => {
        config.scripts.forEach((script) => {
            const [should, reason] = shouldExecuteScript(script);
            if (should) {
                executeScript(script);
            }
        });
    }, 5000);
}

function executeScript(script: Script) {
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

import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";
import { WebSocketServer, WebSocket } from "ws";
import { sign } from "tweetnacl";
import { decodeBase64 } from "tweetnacl-util";
import dotenv from "dotenv";

dotenv.config();

const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 45000;
const REGISTRATION_TIMEOUT = 5000;

const AUTHORIZED_LOCATION_PUBLIC_KEY = process.env.CLIENT_PUBLIC_KEY;
const AUTHORIZED_DAEMON_PUBLIC_KEY = process.env.DAEMON_PUBLIC_KEY;

interface ExtendedWebSocket extends WebSocket {
    isAlive?: boolean;
    clientPublicKey?: string;
    heartbeatTimer?: NodeJS.Timeout;
}

export function setupWebSocket(server: HTTPSServer | HTTPServer) {
    const wss = new WebSocketServer({ server });

    const heartbeat = (ws: ExtendedWebSocket) => {
        ws.isAlive = true;
        if (ws.heartbeatTimer) {
            clearTimeout(ws.heartbeatTimer);
        }
        ws.heartbeatTimer = setTimeout(() => {
            console.log("Client timed out:", ws.clientPublicKey);
            ws.terminate();
        }, CLIENT_TIMEOUT);
    };

    wss.on("connection", (ws: ExtendedWebSocket) => {
        ws.isAlive = true;
        let registrationTimeout = setTimeout(() => {
            console.log("Client failed to register in time");
            ws.close(1008, "Registration timeout");
        }, REGISTRATION_TIMEOUT);

        ws.on("message", (data) => {
            try {
                const parsed = JSON.parse(data.toString());

                // Handle initial registration - this is the only time we verify signatures
                if (!ws.clientPublicKey) {
                    if (parsed.type !== "register") {
                        ws.close(1008, "Expected registration message");
                        return;
                    }

                    const { signature, ...signedMessage } = parsed;
                    const publicKey = signedMessage.publicKey;

                    // Verify the public key is authorized
                    if (
                        publicKey !== AUTHORIZED_LOCATION_PUBLIC_KEY &&
                        publicKey !== AUTHORIZED_DAEMON_PUBLIC_KEY
                    ) {
                        console.log("Unauthorized public key:", publicKey);
                        ws.close(1008, "Unauthorized client");
                        return;
                    }

                    // Verify ownership of private key through signature
                    const messageBytes = new TextEncoder().encode(
                        signedMessage
                    );
                    const signatureBytes = decodeBase64(signature);
                    const publicKeyBytes = decodeBase64(publicKey);

                    if (
                        !sign.detached.verify(
                            messageBytes,
                            signatureBytes,
                            publicKeyBytes
                        )
                    ) {
                        console.log("Invalid registration signature");
                        ws.close(1008, "Invalid registration signature");
                        return;
                    }

                    // Registration successful - connection is now authenticated
                    ws.clientPublicKey = publicKey;
                    clearTimeout(registrationTimeout);
                    heartbeat(ws);
                    console.log(`Client registered: ${publicKey}`);
                    return;
                }

                // All subsequent messages are trusted since the connection is authenticated
                if (parsed.type === "heartbeat") {
                    heartbeat(ws);
                    return;
                }

                // Broadcast message to other authenticated clients
                wss.clients.forEach((client: ExtendedWebSocket) => {
                    if (
                        client !== ws &&
                        client.readyState === WebSocket.OPEN &&
                        client.clientPublicKey
                    ) {
                        client.send(data.toString());
                    }
                });
            } catch (error) {
                console.error("Error processing message:", error);
                ws.close(1008, "Message processing error");
            }
        });

        ws.on("close", () => {
            clearTimeout(registrationTimeout);
            if (ws.heartbeatTimer) {
                clearTimeout(ws.heartbeatTimer);
            }
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
            ws.close(1008, "Internal error");
        });
    });

    // Cleanup any dead connections periodically
    setInterval(() => {
        wss.clients.forEach((ws: ExtendedWebSocket) => {
            if (ws.isAlive === false) {
                console.log(
                    "Terminating inactive connection:",
                    ws.clientPublicKey
                );
                return ws.terminate();
            }
            ws.isAlive = false;
        });
    }, HEARTBEAT_INTERVAL);
}

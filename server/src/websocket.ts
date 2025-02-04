import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";

import { WebSocketServer } from "ws";
import { sign } from "tweetnacl";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";
import dotenv from "dotenv";
dotenv.config();

const AUTHORIZED_LOCATION_PUBLIC_KEY = process.env.CLIENT_PUBLIC_KEY;
const AUTHORIZED_DAEMON_PUBLIC_KEY = process.env.DAEMON_PUBLIC_KEY;

export function setupWebSocket(server: HTTPSServer | HTTPServer) {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws) => {
        let clientPublicKey: string | null = null;

        ws.on("message", (data) => {
            const parsed = JSON.parse(data.toString());

            if (parsed.type === "register") {
                if (AUTHORIZED_DAEMON_PUBLIC_KEY === parsed.publicKey) {
                    console.log("Daemon registered");
                } else if (
                    AUTHORIZED_LOCATION_PUBLIC_KEY === parsed.publicKey
                ) {
                    console.log("Location client registered");
                } else {
                    console.log("Unauthorized client " + parsed.publicKey);
                    ws.close(1008, "Unauthorized client");
                    return;
                }

                clientPublicKey = parsed.publicKey;
                return;
            }

            if (!clientPublicKey) {
                ws.close(1008, "Client not registered");
                return;
            }

            const { message } = parsed;
            const signature = decodeBase64(parsed.signature);
            const messageBytes = new TextEncoder().encode(parsed.message);

            const isValid = sign.detached.verify(
                messageBytes,
                signature,
                decodeBase64(clientPublicKey)
            );

            if (!isValid) {
                ws.close(1008, "Invalid signature");
                return;
            }

            wss.clients.forEach((client) => {
                if (client !== ws) {
                    console.log("Sending message to clients");
                    client.send(
                        JSON.stringify({
                            message,
                            signature: parsed.signature,
                            publicKey: clientPublicKey,
                        })
                    );
                }
            });
        });
    });
}

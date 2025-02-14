import { useEffect, useRef } from "react";
import { sign } from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

interface AuthWebSocketOptions {
    onOpen?: () => void;
    onClose?: () => void;
    onMessage?: (data: unknown) => void;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_INTERVAL = 5000; // 5 seconds

export function useAuthenticatedWebSocket(
    url: string,
    options: AuthWebSocketOptions = {}
) {
    const ws = useRef<WebSocket | null>(null);
    const keyPair = useRef<{ publicKey: Uint8Array; secretKey: Uint8Array }>();
    const heartbeatInterval = useRef<NodeJS.Timeout>();
    const reconnectTimeout = useRef<NodeJS.Timeout>();
    const optionsRef = useRef<AuthWebSocketOptions>();

    optionsRef.current = options;

    const send = (data: object) => {
        if (!ws.current) return;
        ws.current.send(JSON.stringify(data));
    };

    useEffect(() => {
        const sendSigned = (data: object) => {
            if (!keyPair.current) {
                return;
            }
            const messageToSign = JSON.stringify(data);
            const messageBytes = new TextEncoder().encode(messageToSign);
            const signature = sign.detached(
                messageBytes,
                keyPair.current.secretKey
            );

            send({
                type: "register",
                message: messageToSign,
                signature: encodeBase64(signature),
            });
        };

        const startHeartbeat = () => {
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
            }

            heartbeatInterval.current = setInterval(() => {
                if (ws.current?.readyState === WebSocket.OPEN) {
                    send({ type: "heartbeat" });
                }
            }, HEARTBEAT_INTERVAL);
        };

        const connect = () => {
            if (ws.current) {
                ws.current.close();
            }

            console.log("Connecting to: " + url);
            ws.current = new WebSocket(url);

            ws.current.onopen = () => {
                if (ws.current && keyPair.current) {
                    sendSigned({
                        type: "register",
                        publicKey: encodeBase64(keyPair.current.publicKey),
                    });
                    startHeartbeat();
                }

                optionsRef.current?.onOpen?.();
            };

            ws.current.onclose = () => {
                if (heartbeatInterval.current) {
                    clearInterval(heartbeatInterval.current);
                }

                if (reconnectTimeout.current) {
                    clearTimeout(reconnectTimeout.current);
                }
                reconnectTimeout.current = setTimeout(
                    connect,
                    RECONNECT_INTERVAL
                );

                optionsRef.current?.onClose?.();
            };

            ws.current.onerror = (error) => {
                console.error("WebSocket error:", error);
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    optionsRef.current?.onMessage?.(data);
                } catch (error) {
                    console.error("Error parsing message:", error);
                }
            };
        };

        const storedSecretKey = localStorage.getItem("clientSecretKey");
        if (storedSecretKey) {
            const secretKey = decodeBase64(storedSecretKey);
            keyPair.current = sign.keyPair.fromSecretKey(secretKey);
        } else {
            keyPair.current = sign.keyPair();
            localStorage.setItem(
                "clientSecretKey",
                encodeBase64(keyPair.current.secretKey)
            );
        }

        connect();

        return () => {
            console.log("Unmounting or got new url,options");
            if (ws.current) {
                console.log("Closing websocket");
                ws.current.close();
            }
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
            }
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
        };
    }, [url]);

    return {
        send,
        readyState: ws.current?.readyState ?? WebSocket.CLOSED,
    };
}

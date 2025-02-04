import { useEffect, useRef } from "react";
import { sign } from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

interface AuthWebSocketOptions {
    onOpen?: () => void;
    onClose?: () => void;
    onMessage?: (data: unknown) => void;
}

export function useAuthenticatedWebSocket(
    url: string,
    options: AuthWebSocketOptions = {}
) {
    const ws = useRef<WebSocket | null>(null);
    const keyPair = useRef<{ publicKey: Uint8Array; secretKey: Uint8Array }>();

    useEffect(() => {
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

        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
            if (ws.current && keyPair.current) {
                ws.current.send(
                    JSON.stringify({
                        type: "register",
                        publicKey: encodeBase64(keyPair.current.publicKey),
                    })
                );
            }
            options.onOpen?.();
        };

        ws.current.onclose = () => {
            options.onClose?.();
        };

        return () => ws.current?.close();
    }, [url]);

    const sendSigned = (data: object) => {
        if (!ws.current || !keyPair.current) return;

        const messageStr = JSON.stringify(data);
        const messageBytes = new TextEncoder().encode(messageStr); // Convert string to Uint8Array

        const signature = sign.detached(
            messageBytes,
            keyPair.current.secretKey
        );

        const payload = JSON.stringify({
            message: messageStr,
            signature: encodeBase64(signature),
        });

        ws.current.send(payload);
    };

    return {
        sendSigned,
        readyState: ws.current?.readyState ?? WebSocket.CLOSED,
    };
}

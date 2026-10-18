
// Import getVehicles function and connectedSockets set
import { connectedSockets, getWebsocketPayload } from "../services/foliService.ts";

// Handle API requests
const apiHandler = (req: Request): Response => {
 
    // If request is not websocket, reject with upgrade required status code
    if (req.headers.get('upgrade') != 'websocket') {
        return new Response(null, { status: 426 });
    }

    // Only allow websocket from localhost and app server
    const origin = req.headers.get('origin') ?? '';
    const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',');
    if (origin === '' || !allowedOrigins.includes(origin)) {
        return new Response(null, { status: 404});
    }

    // Upgrade http request to websocket
    const { socket, response } = Deno.upgradeWebSocket(req);

    // Set up websocket event listeners
    socket.onopen = () => {
        console.log("Websocket connection opened!");
        // Send initial vehicles data (if first poll has completed)
        const payload = getWebsocketPayload();
        if (payload) socket.send(payload);
        // Add socket to set of websockets
        connectedSockets.add(socket);
    }
    socket.onmessage = () => {
        // Clients do not send data, ignore messages (no logging to avoid log flooding)
    }
    socket.onclose = () => {
        console.log('WebSocket closed');
        // Remove socket from set of websockets
        connectedSockets.delete(socket);
    };
    socket.onerror = (error: Event) => {
        console.log("WebSocket error: ", error);
    }

    // Return http response for websocket upgrade
    return response; 

};

export { apiHandler };

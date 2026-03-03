
// Import getVehicles function and connectedSockets set
import { getVehicles, connectedSockets } from "../services/foliService.ts";

// Handle API requests
const apiHandler = (req: Request): Response => {

    // If request is not websocket, reject with upgrade required status code
    if (req.headers.get('upgrade') != 'websocket') {
        return new Response(null, { status: 426 });
    }

    // If request is not from localhost, reject 
    if (req.headers.get('origin') !== 'http://localhost:8080') {
        return new Response(null, { status: 404});
    }

    // Upgrade http request to websocket
    const { socket, response } = Deno.upgradeWebSocket(req);

    // Set up websocket event listeners
    socket.onopen = () => {
        console.log("Websocket connection opened!");
        // Send initial vehicles data
        socket.send(JSON.stringify(getVehicles()));
        // Add socket to set of websockets
        connectedSockets.add(socket);
    }
    socket.onmessage = (event: MessageEvent) => {
        console.log("WebSocket message: ", event);
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


// Import function to get vehicles and set for websockets
import { getVehicles, connectedSockets } from "../services/foliService.ts";

// Handle API requests
const apiHandler = (req: Request): Response => {

    // If request is not websocket, reject with upgrade required code
    if (req.headers.get('upgrade') != 'websocket') {
        return new Response(null, { status: 426 });
    }

    // Upgrade request to websocket
    const { socket, response } = Deno.upgradeWebSocket(req);

    // Set up websocket event listeners
    socket.onopen = () => {
        console.log("Websocket connection opened!");
        // Send initial vehicles data
        socket.send(JSON.stringify(getVehicles()));
        // Add socket to set of websockets
        connectedSockets.add(socket);
    }
    socket.onmessage = (event) => {
        console.log("WebSocket message: ", event);
    }
    socket.onclose = () => {
        console.log('WebSocket closed');
        // Remove socket from set of websockets
        connectedSockets.delete(socket);
    };
    socket.onerror = (event) => {
        console.log("WebSocket error: ", event);
    }

    // Return http response for websocket upgrade
    return response; 

};

export { apiHandler };

// Create websocket connection to the api server
const websocket = new WebSocket('http://localhost:8080/api/vehicles');

// When websocket connection has been opened
websocket.onopen = (e) => {
    console.log(e.data);
};

// When moved vehicles data is broadcast
websocket.onmessage = (e) => {
    console.log(JSON.parse(e.data));
};
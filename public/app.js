// src/client/app.ts
var websocket = new WebSocket("http://localhost:8080/api/vehicles");
websocket.onopen = (e) => {
  console.log(e.data);
};
websocket.onmessage = (e) => {
  console.log(JSON.parse(e.data));
};

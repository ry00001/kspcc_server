const socket = io();

socket.on('power', power => {
    document.getElementById('power').innerHTML = `Power: ${power}`;
})
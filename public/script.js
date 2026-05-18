const socket = io();

let playerSymbol = "";

let isgameover = false;

let audioturn = new Audio("ting.mp3");

let winsound = new Audio("open-sound.mp3");

let currentRoom = "";

const params =
    new URLSearchParams(window.location.search);

const roomFromURL = params.get("room");

if (roomFromURL) {

    currentRoom = roomFromURL;

    socket.emit("joinRoom", currentRoom);

}

function generateRoomCode() {

    return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

}

document
    .getElementById("createRoom")
    .addEventListener("click", () => {

        currentRoom = generateRoomCode();

        // UPDATE URL
        window.history.pushState(
            {},
            "",
            `?room=${currentRoom}`
        );

        socket.emit("joinRoom", currentRoom);

        alert("Room created!");

    });


document
    .getElementById("copyLink")
    .addEventListener("click", async () => {

        if (!currentRoom) {

            alert("Create a room first");

            return;

        }

        await navigator.clipboard.writeText(
            window.location.href
        );

        alert("Invite link copied!");

    });


// PLAYER ASSIGNMENT
socket.on("playerAssignment", (symbol) => {

    if (symbol === "unassigned") {

        document.querySelector(".status").innerText =
            "Click first to become X";

    }

});


// RECEIVE GAME STATE
socket.on("gameState", (data) => {

    let boxes = document.getElementsByClassName("box");

    data.board.forEach((value, index) => {

        boxes[index].querySelector(".boxtext").innerText =
            value;

    });

    if (!isgameover) {

        document.querySelector(".info").innerText =
            "Turn: " + data.currentTurn;

    }

});


// GAME OVER
socket.on("gameOver", (data) => {

    isgameover = true;

    if (data.draw) {

        document.querySelector(".info").innerText =
            "Match Draw!";

        return;

    }

    winsound.play();

    document.querySelector(".info").innerText =
        data.winner + " Won";

    confetti({
        particleCount: 100,
        angle: 60,
        spread: 70,
        origin: { x: 0 }
    });

    confetti({
        particleCount: 100,
        angle: 120,
        spread: 70,
        origin: { x: 1 }
    });

});

// Frontend Player Status
socket.on("playerCount", (count) => {

    let status =
        document.querySelector(".status");

    if (count === 1) {

        status.innerText =
            "Waiting for another player...";

    }
    else if (count === 2) {

        status.innerText =
            "Both players connected";

    }
    else {

        status.innerText =
            `${count} users in room`;

    }

});

// Game Reset
socket.on("gameReset", () => {

    isgameover = false;

    playerSymbol = "";

    document.querySelector(".info").innerText =
    "Turn: X";

    document.querySelector(".status").innerText =
    "Click first to become X";

    document.querySelector(".imgbox")
        .getElementsByTagName("img")[0]
        .style.width = "0px";

    document.querySelector(".line")
        .style.width = "0vw";

});

// Roles Updated
socket.on("rolesUpdated", (players) => {

    for (let id in players) {

        if (id === socket.id) {

            playerSymbol = players[id];

            document.querySelector(".status").innerText =
                `You are ${playerSymbol}`;

        }

    }

});


socket.on("playerLeft", () => {

    document.querySelector(".status").innerText =
        "A player disconnected";

});


// CLICK EVENTS
let boxes = document.getElementsByClassName("box");

Array.from(boxes).forEach((element, index) => {

    element.addEventListener("click", () => {

        if (isgameover) return;

        socket.emit("makeMove", index);

        audioturn.play();

    });

});


// RESET
document.getElementById("reset")
    .addEventListener("click", () => {

        isgameover = false;

        socket.emit("resetGame");

    });
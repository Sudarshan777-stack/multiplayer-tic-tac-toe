const express = require("express");

const http = require("http");

const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server);

app.use(express.static("public"));


// ALL ROOMS
let rooms = {};


// WIN CONDITIONS
const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];


// CHECK WINNER
function checkWinner(board) {

    for (let combo of wins) {

        let [a, b, c] = combo;

        if (
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
        ) {

            return board[a];

        }
    }

    return null;

}


// CHECK DRAW
function checkDraw(board) {

    return board.every(cell => cell !== "");

}


io.on("connection", (socket) => {

    console.log("User connected:", socket.id);


    // TRACK CURRENT ROOM
    socket.currentRoom = null;


    // JOIN ROOM
    socket.on("joinRoom", (roomCode) => {

        // LEAVE OLD ROOM
        if (socket.currentRoom) {

            socket.leave(socket.currentRoom);

        }

        socket.join(roomCode);

        socket.currentRoom = roomCode;


        // CREATE ROOM
        if (!rooms[roomCode]) {

            rooms[roomCode] = {

                board: ["", "", "", "", "", "", "", "", ""],

                currentTurn: "X",

                players: {},

                symbolsAssigned: {
                    X: null,
                    O: null
                },

                gameOver: false

            };

        }

        let room = rooms[roomCode];


        // ASSIGN SYMBOL
        room.players[socket.id] = null;

        socket.emit(
            "playerAssignment",
            "unassigned"
        );


        // SEND GAME STATE
        socket.emit(
            "gameState",
            {
                board: room.board,
                currentTurn: room.currentTurn
            }
        );


        // SEND PLAYER COUNT
        io.to(roomCode).emit(
            "playerCount",
            Object.keys(room.players).length
        );

    });


    // MAKE MOVE
    socket.on("makeMove", (index) => {

        let roomCode = socket.currentRoom;

        if (!roomCode) return;

        let room = rooms[roomCode];

        if (!room) return;

        let player =
            room.players[socket.id];


        // VALIDATIONS
        // if (
        //     room.gameOver ||
        //     player !== room.currentTurn ||
        //     room.board[index] !== ""
        // ) {

        //     return;

        // }
        if (room.gameOver) return;


        // ASSIGN X TO FIRST PLAYER WHO MOVES
        if (!room.symbolsAssigned.X) {

            room.symbolsAssigned.X = socket.id;

            room.players[socket.id] = "X";

            io.to(roomCode).emit(
                "rolesUpdated",
                room.players
            );

        }


        // ASSIGN O TO SECOND PLAYER
        else if (
            !room.symbolsAssigned.O &&
            room.symbolsAssigned.X !== socket.id
        ) {

            room.symbolsAssigned.O = socket.id;

            room.players[socket.id] = "O";

            io.to(roomCode).emit(
                "rolesUpdated",
                room.players
            );

        }


        player =
            room.players[socket.id];


        // VALIDATIONS
        if (
            !player ||
            player !== room.currentTurn ||
            room.board[index] !== ""
        ) {

            return;

        }


        // UPDATE BOARD
        room.board[index] = player;


        // CHECK WINNER
        let winner =
            checkWinner(room.board);


        if (winner) {

            room.gameOver = true;

            io.to(roomCode).emit(
                "gameOver",
                {
                    winner
                }
            );

        }
        else if (checkDraw(room.board)) {

            room.gameOver = true;

            io.to(roomCode).emit(
                "gameOver",
                {
                    draw: true
                }
            );

        }
        else {

            room.currentTurn =
                room.currentTurn === "X"
                    ? "O"
                    : "X";

        }


        // SEND UPDATED STATE
        io.to(roomCode).emit(
            "gameState",
            {
                board: room.board,
                currentTurn: room.currentTurn
            }
        );

    });


    // RESET GAME
    socket.on("resetGame", () => {

        let roomCode = socket.currentRoom;

        if (!roomCode) return;

        let room = rooms[roomCode];

        if (!room) return;

        room.board =
            ["", "", "", "", "", "", "", "", ""];

        room.currentTurn = "X";

        room.gameOver = false;

        room.symbolsAssigned = {
            X: null,
            O: null
        };

        for (let id in room.players) {

            room.players[id] = null;

        }


        io.to(roomCode).emit(
            "gameState",
            {
                board: room.board,
                currentTurn: room.currentTurn
            }
        );

        io.to(roomCode).emit("gameReset");

    });


    // DISCONNECT
    socket.on("disconnect", () => {

        let roomCode = socket.currentRoom;

        if (!roomCode) return;

        let room = rooms[roomCode];

        if (!room) return;

        delete room.players[socket.id];


        io.to(roomCode).emit(
            "playerCount",
            Object.keys(room.players).length
        );

        io.to(roomCode).emit(
            "playerLeft"
        );


        // CLEAN EMPTY ROOMS
        if (
            Object.keys(room.players).length === 0
        ) {

            delete rooms[roomCode];

            console.log(
                `Room ${roomCode} deleted`
            );

        }

        console.log("User disconnected");

    });

});


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});
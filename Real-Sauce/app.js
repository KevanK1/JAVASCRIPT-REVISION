const express = require("express");
const http = require("http");
const { Chess } = require("chess.js");
const socket = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const games = new Map();
const waitingPlayers = [];

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on('joinGame', () => {
        if (waitingPlayers.length > 0) {
            const opponent = waitingPlayers.pop();
            const gameId = `${socket.id}-${opponent}`;
            
            games.set(gameId, {
                white: opponent,
                black: socket.id,
                game: new Chess()
            });

            io.to(opponent).emit('playerColor', 'w');
            socket.emit('playerColor', 'b');
        } else {
            waitingPlayers.push(socket.id);
        }
    });

    socket.on('move', (data) => {
        const game = Array.from(games.values()).find(g => 
            g.white === socket.id || g.black === socket.id
        );

        if (game) {
            const opponent = game.white === socket.id ? game.black : game.white;
            io.to(opponent).emit('gameMove', data);
        }
    });

    socket.on('disconnect', () => {
        const index = waitingPlayers.indexOf(socket.id);
        if (index > -1) {
            waitingPlayers.splice(index, 1);
        }
        
        games.forEach((game, gameId) => {
            if (game.white === socket.id || game.black === socket.id) {
                const opponent = game.white === socket.id ? game.black : game.white;
                io.to(opponent).emit('gameOver', 'Opponent disconnected');
                games.delete(gameId);
            }
        });
    });
});

app.get("/", (req, res) => {
    res.render('index', { title: "CHESSMASTER" });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
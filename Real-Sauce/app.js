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
const activeGames = new Map(); // Stores active game rooms

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on('joinGame', (mode) => {
        if (mode === 'player') {
            if (waitingPlayers.length > 0) {
                const opponent = waitingPlayers.pop();
                const gameId = `game-${Date.now()}`;
                
                const gameState = {
                    white: opponent,
                    black: socket.id,
                    game: new Chess(),
                    viewers: new Set(),
                    gameId
                };
                
                games.set(gameId, gameState);
                activeGames.set(gameId, gameState);

                // Join both players to the game room
                socket.join(gameId);
                io.sockets.sockets.get(opponent)?.join(gameId);

                io.to(opponent).emit('gameStart', { color: 'w', gameId });
                socket.emit('gameStart', { color: 'b', gameId });
                
                // Broadcast new game available to viewers
                io.emit('activeGamesUpdate', Array.from(activeGames.keys()));
            } else {
                waitingPlayers.push(socket.id);
                socket.emit('waiting');
            }
        } else if (mode === 'viewer' && activeGames.size > 0) {
            // Send list of active games to viewer
            socket.emit('activeGamesUpdate', Array.from(activeGames.keys()));
        }
    });

    socket.on('joinAsViewer', (gameId) => {
        const game = activeGames.get(gameId);
        if (game) {
            socket.join(gameId);
            game.viewers.add(socket.id);
            socket.emit('viewerJoined', {
                gameId,
                position: game.game.fen()
            });
        }
    });

    socket.on('move', ({ gameId, move }) => {
        const game = games.get(gameId);
        if (game) {
            const moveResult = game.game.move(move);
            if (moveResult) {
                const position = game.game.fen();
                io.to(gameId).emit('gameMove', {
                    position,
                    move,
                    turn: game.game.turn()
                });

                if (game.game.isGameOver()) {
                    let result = '';
                    if (game.game.isCheckmate()) result = 'Checkmate!';
                    else if (game.game.isDraw()) result = 'Draw!';
                    else if (game.game.isStalemate()) result = 'Stalemate!';
                    
                    io.to(gameId).emit('gameOver', result);
                    activeGames.delete(gameId);
                    io.emit('activeGamesUpdate', Array.from(activeGames.keys()));
                }
            }
        }
    });

    socket.on('disconnect', () => {
        const index = waitingPlayers.indexOf(socket.id);
        if (index > -1) {
            waitingPlayers.splice(index, 1);
        }
        
        games.forEach((game, gameId) => {
            if (game.white === socket.id || game.black === socket.id) {
                io.to(gameId).emit('gameOver', 'Opponent disconnected');
                activeGames.delete(gameId);
                games.delete(gameId);
                io.emit('activeGamesUpdate', Array.from(activeGames.keys()));
            } else if (game.viewers.has(socket.id)) {
                game.viewers.delete(socket.id);
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
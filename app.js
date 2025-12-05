/* Use Color Comments
    1. // explains the above code's purpose
    2. // ! Remember IT
    3. // & Why we used it
*/

const express = require("express")
const http = require("http")
const { Chess } = require("chess.js")
const socket = require("socket.io")
const path = require("path")
// got the modules and Class(chess wali)

const app = express()
// & the express app managing the routing

const server = http.createServer(app)
const io = socket(server)
/* ! SocketIO needs a server as a param upon which it manages the realtime changes
   & So we create http server from "app" -express server managing routing and all- and give it to Socket as a parameter and have it in "io" (a reference variable to SocketIO's object) 
*/

const chess = new Chess()
// having all the chess rules from chess.js

let players = {}
let currentPlayer = "w"
// set the vars for game - players object tracks socket IDs and their roles

app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res) => {
    res.render(`index`, { title: "Chess Game" })
})

// ! SOCKET.IO CONNECTION HANDLING - This is the main crux of real-time multiplayer
io.on("connection", (uniqueSocket) => {
    console.log("New user connected:", uniqueSocket.id)

    // & ROLE ASSIGNMENT - First two users become players, rest are spectators
    if (!players.white) {
        // First player gets white
        players.white = uniqueSocket.id
        uniqueSocket.emit("playerRole", "w")
        console.log("Assigned WHITE to:", uniqueSocket.id)
    }
    else if (!players.black) {
        // Second player gets black
        players.black = uniqueSocket.id
        uniqueSocket.emit("playerRole", "b")
        console.log("Assigned BLACK to:", uniqueSocket.id)
    }
    else {
        // Third+ users are spectators
        uniqueSocket.emit("spectatorRole")
        console.log("User is SPECTATOR:", uniqueSocket.id)
    }

    // Send current board state to the newly connected user
    uniqueSocket.emit("boardState", chess.fen())

    // ! HANDLE DISCONNECTION - Remove player from tracking
    uniqueSocket.on("disconnect", () => {
        console.log("User disconnected:", uniqueSocket.id)

        if (players.white === uniqueSocket.id) {
            delete players.white
            console.log("White player left")
        }
        else if (players.black === uniqueSocket.id) {
            delete players.black
            console.log("Black player left")
        }
    })

    // ! HANDLE MOVES - This is where Socket.io shines for real-time gameplay
    uniqueSocket.on("move", (move) => {
        try {
            // & Validate it's the correct player's turn
            if (chess.turn() === "w" && uniqueSocket.id !== players.white) {
                uniqueSocket.emit("invalidMove", "Not your turn!")
                return
            }
            if (chess.turn() === "b" && uniqueSocket.id !== players.black) {
                uniqueSocket.emit("invalidMove", "Not your turn!")
                return
            }

            // & Try to make the move using chess.js validation
            const result = chess.move(move)

            if (result) {
                // Valid move! Update current player
                currentPlayer = chess.turn()

                // ! BROADCAST to ALL connected clients - this is the Socket.io magic
                io.emit("move", move)
                io.emit("boardState", chess.fen())

                console.log("Move made:", move)

                // Check for game over
                if (chess.isGameOver()) {
                    if (chess.isCheckmate()) {
                        io.emit("gameOver", `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins!`)
                    } else if (chess.isDraw()) {
                        io.emit("gameOver", "Game is a draw!")
                    }
                }
            } else {
                // Invalid move
                uniqueSocket.emit("invalidMove", "Invalid move!")
            }
        } catch (error) {
            console.error("Move error:", error)
            uniqueSocket.emit("invalidMove", "Invalid move!")
        }
    })
})

// YES we use "server" and not "app", As the server will be having server which the SocketIO manages to do realtime shit.
server.listen(3000, () => {
    console.log('Server running at http://localhost:3000')
    console.log('Open multiple browser windows to test multiplayer!')
})
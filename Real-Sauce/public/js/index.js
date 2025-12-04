// ! SOCKET.IO CLIENT - This connects to our backend server
const socket = io()

// Initialize chess.js instance for game logic
const chess = new Chess()

// DOM elements
const boardElement = document.querySelector("#chessboard")
const playerRoleElement = document.querySelector("#playerRole")
const turnIndicatorElement = document.querySelector("#turnIndicator")
const statusMessageElement = document.querySelector("#statusMessage")

// Game state
let playerRole = null
let draggedPiece = null
let sourceSquare = null

// & SOCKET EVENT LISTENERS - This is where real-time magic happens!

// Listen for role assignment from server
socket.on("playerRole", (role) => {
    playerRole = role
    playerRoleElement.textContent = `You are: ${role === 'w' ? 'White ♔' : 'Black ♚'}`
    playerRoleElement.style.color = role === 'w' ? '#fff' : '#333'
    showStatus(`You are playing as ${role === 'w' ? 'White' : 'Black'}!`, 'playing')
    renderBoard()
})

// Listen for spectator role
socket.on("spectatorRole", () => {
    playerRole = "spectator"
    playerRoleElement.textContent = "You are: Spectator 👁️"
    showStatus("You are watching the game. Waiting for a player slot...", 'spectator')
    renderBoard()
})

// Listen for board state updates
socket.on("boardState", (fen) => {
    chess.load(fen)
    renderBoard()
    updateTurnIndicator()
})

// Listen for moves from other players
socket.on("move", (move) => {
    chess.move(move)
    renderBoard()
    updateTurnIndicator()
})

// Listen for invalid move messages
socket.on("invalidMove", (message) => {
    showStatus(message, 'error')
    setTimeout(() => {
        statusMessageElement.style.display = 'none'
    }, 2000)
})

// Listen for game over
socket.on("gameOver", (message) => {
    showStatus(message, 'error')
})

// ! RENDER BOARD FUNCTION - Creates the visual chessboard
function renderBoard() {
    const board = chess.board()
    boardElement.innerHTML = ""

    // Flip board for black player
    const isFlipped = playerRole === 'b'

    board.forEach((row, rowIndex) => {
        row.forEach((square, colIndex) => {
            const squareDiv = document.createElement("div")

            // Calculate actual position
            const actualRow = isFlipped ? rowIndex : 7 - rowIndex
            const actualCol = isFlipped ? 7 - colIndex : colIndex

            // Determine square color
            const isLight = (actualRow + actualCol) % 2 === 0
            squareDiv.classList.add("square")
            squareDiv.classList.add(isLight ? "light" : "dark")

            // Store square position
            const file = String.fromCharCode(97 + actualCol) // a-h
            const rank = actualRow + 1 // 1-8
            const position = `${file}${rank}`
            squareDiv.dataset.square = position

            // Add piece if present
            if (square) {
                const pieceDiv = document.createElement("div")
                pieceDiv.classList.add("piece")
                pieceDiv.textContent = getPieceUnicode(square)
                pieceDiv.draggable = canDragPiece(square)

                if (!canDragPiece(square)) {
                    pieceDiv.classList.add("not-draggable")
                }

                // Drag events
                pieceDiv.addEventListener("dragstart", handleDragStart)
                pieceDiv.addEventListener("dragend", handleDragEnd)

                squareDiv.appendChild(pieceDiv)
            }

            // Drop events
            squareDiv.addEventListener("dragover", handleDragOver)
            squareDiv.addEventListener("drop", handleDrop)

            boardElement.appendChild(squareDiv)
        })
    })
}

// ! PIECE UNICODE MAPPING
function getPieceUnicode(piece) {
    const unicodePieces = {
        'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
        'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
    }
    return unicodePieces[piece.type] || ''
}

// Check if player can drag this piece
function canDragPiece(piece) {
    if (playerRole === 'spectator') return false
    if (chess.turn() !== playerRole) return false
    return piece.color === playerRole
}

// ! DRAG AND DROP HANDLERS
function handleDragStart(e) {
    const square = e.target.parentElement
    sourceSquare = square.dataset.square
    draggedPiece = e.target

    setTimeout(() => {
        square.classList.add("dragging")
    }, 0)
}

function handleDragEnd(e) {
    const square = e.target.parentElement
    square.classList.remove("dragging")
}

function handleDragOver(e) {
    e.preventDefault()
    e.currentTarget.classList.add("drag-over")
}

function handleDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove("drag-over")

    const targetSquare = e.currentTarget.dataset.square

    if (sourceSquare && targetSquare) {
        // Try to make the move
        const move = {
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q' // Always promote to queen for simplicity
        }

        // ! EMIT MOVE TO SERVER via Socket.io - This is the key!
        socket.emit("move", move)
    }

    // Remove drag-over class from all squares
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('drag-over')
    })
}

// Update turn indicator
function updateTurnIndicator() {
    const turn = chess.turn()
    turnIndicatorElement.textContent = `Turn: ${turn === 'w' ? 'White ♔' : 'Black ♚'}`

    if (playerRole !== 'spectator') {
        if (turn === playerRole) {
            turnIndicatorElement.style.background = 'rgba(85, 239, 196, 0.3)'
        } else {
            turnIndicatorElement.style.background = 'rgba(255, 255, 255, 0.2)'
        }
    }
}

// Show status message
function showStatus(message, type) {
    statusMessageElement.textContent = message
    statusMessageElement.className = `status-message ${type}`
    statusMessageElement.style.display = 'block'
}

// Initial render
renderBoard()
updateTurnIndicator()
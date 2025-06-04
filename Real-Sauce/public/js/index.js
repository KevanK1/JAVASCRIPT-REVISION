const socket = io();
let board = null;
let game = null;
let playerColor = 'w';

// Initialize the game when Play button is clicked
document.getElementById('playButton').addEventListener('click', () => {
    document.querySelector('.landing-page').classList.add('hidden');
    document.querySelector('.game-container').classList.remove('hidden');
    initializeGame();
});

function initializeGame() {
    // Initialize the chessboard
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    };
    board = Chessboard('board', config);

    // Socket events
    socket.emit('joinGame');

    socket.on('playerColor', (color) => {
        playerColor = color;
        updateStatus();
    });

    socket.on('gameMove', (move) => {
        board.position(move.position);
        updateStatus();
    });

    socket.on('gameOver', (result) => {
        document.getElementById('game-status').textContent = `Game Over: ${result}`;
    });
}

function onDragStart(source, piece) {
    // Only allow the current player to move their pieces
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
        game.turn() !== playerColor) {
        return false;
    }
}

function onDrop(source, target) {
    const move = {
        from: source,
        to: target,
        promotion: 'q'
    };

    const moveResult = game.move(move);
    if (moveResult === null) return 'snapback';

    socket.emit('move', {
        move: move,
        position: game.fen()
    });

    updateStatus();
}

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    let status = '';
    if (game.in_checkmate()) {
        status = 'Game Over: Checkmate!';
    } else if (game.in_draw()) {
        status = 'Game Over: Draw!';
    } else {
        status = `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
        if (game.in_check()) {
            status += ' (CHECK)';
        }
    }
    document.getElementById('game-status').textContent = status;
}
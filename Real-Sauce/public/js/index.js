const socket = io();
let board = null;
let game = new Chess();
let playerColor = 'w';
let gameId = null;
let isViewer = false;

document.getElementById('playButton').addEventListener('click', () => {
    document.querySelector('.landing-page').classList.add('hidden');
    document.querySelector('.mode-selection').classList.remove('hidden');
});

document.getElementById('playerMode').addEventListener('click', () => {
    document.querySelector('.mode-selection').classList.add('hidden');
    document.querySelector('.game-container').classList.remove('hidden');
    initializeGame('player');
});

document.getElementById('viewerMode').addEventListener('click', () => {
    document.querySelector('.mode-selection').classList.add('hidden');
    document.querySelector('.game-list').classList.remove('hidden');
    initializeGame('viewer');
});

function initializeGame(mode) {
    const config = {
        draggable: mode === 'player',
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    };
    board = Chessboard('board', config);
    
    socket.emit('joinGame', mode);

    if (mode === 'viewer') {
        isViewer = true;
    }
}

socket.on('waiting', () => {
    document.getElementById('game-status').textContent = 'Waiting for opponent...';
});

socket.on('activeGamesUpdate', (games) => {
    if (isViewer) {
        const gameList = document.getElementById('gamesList');
        gameList.innerHTML = '';
        games.forEach(game => {
            const button = document.createElement('button');
            button.textContent = `Watch Game ${game}`;
            button.className = 'game-button';
            button.onclick = () => {
                socket.emit('joinAsViewer', game);
                document.querySelector('.game-list').classList.add('hidden');
                document.querySelector('.game-container').classList.remove('hidden');
            };
            gameList.appendChild(button);
        });
    }
});

socket.on('gameStart', (data) => {
    playerColor = data.color;
    gameId = data.gameId;
    game = new Chess();
    board.orientation(playerColor === 'w' ? 'white' : 'black');
    updateStatus();
});

socket.on('viewerJoined', (data) => {
    gameId = data.gameId;
    game.load(data.position);
    board.position(data.position);
    document.getElementById('game-status').textContent = 'Viewing live game';
});

socket.on('gameMove', (data) => {
    game.load(data.position);
    board.position(data.position);
    updateStatus();
});

socket.on('gameOver', (result) => {
    document.getElementById('game-status').textContent = `Game Over: ${result}`;
    if (!isViewer) {
        // Disable dragging for players when game is over
        board.draggable = false;
    }
});

function onDragStart(source, piece) {
    if (isViewer) return false;
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
        game.turn() !== playerColor) {
        return false;
    }
}

function onDrop(source, target) {
    if (isViewer) return 'snapback';
    
    const move = {
        from: source,
        to: target,
        promotion: 'q'
    };

    const moveResult = game.move(move);
    if (moveResult === null) return 'snapback';

    socket.emit('move', {
        gameId,
        move: move
    });

    updateStatus();
}

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    let status = '';
    if (game.isCheckmate()) {
        status = 'Game Over: Checkmate!';
    } else if (game.isDraw()) {
        status = 'Game Over: Draw!';
    } else {
        status = `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
        if (game.isCheck()) {
            status += ' (CHECK)';
        }
    }
    document.getElementById('game-status').textContent = status;
}
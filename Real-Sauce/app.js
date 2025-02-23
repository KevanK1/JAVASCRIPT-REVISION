const express = require("express")
const http = require("http")
const {Chess} = require("chess.js")
const socket = require("socket.io")
const path = require("path")
const { title } = require("process")
// got the modeuls and Class(chess wali)

const app = express() // the xpress app managing the routing

//*
const server = http.createServer(app) // a http server having express app in it managing the routing (did for socket)
const io = socket(server)

const chess = new Chess()  
// having all the chess rules from chess.js

let players = {}
let currPlayer = "W"
// set the vars

app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname,"public")))

io.on("connection",(userData)=>{ //userData is generally called "socket" 
    console.log("connected")
    
})

app.get("/",(req,res)=>{
    res.render(`index`,{title:"Chess Game"})
})

app.listen(3000,()=>{
    console.log('http://localhost:3000')
})
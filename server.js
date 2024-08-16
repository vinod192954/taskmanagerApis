const express = require('express')
const path = require('path')
const cors= require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())
app.use(cors())
const dbpath = path.join(__dirname,'taskmanager.db')
let db=null 


const initialDbAndServer=async()=>{
    try{
        db=await open({
            filename:dbpath,
            driver:sqlite3.Database
        })
        app.listen(3008,()=>{
            console.log("server is listening at 3008 port")
        })
    }
    catch(error){
        console.log(`DB error ${error.message}`)
        process.exit(1)
    }
}

initialDbAndServer()

app.post("/register",async(request,response)=>{
    const {username,email,password,role} = request.body 
    const hashedPassword = await bcrypt.hash(password,10)
    const selectedQuery =  `SELECT * FROM users WHERE username = ?`
    const dbUser = await db.get(selectedQuery)
    if (dbUser===undefined){
        const createNewUserQuery = `INSERT INTO users(username,email,password,role) 
        VALUES('${username}','${email}','${hashedPassword}','${role}')` 
        const dbResponse = await db.run(createNewUserQuery)
        response.send({message:"User created successfully"})
    }
    else{
        response.send("User already exist")
    }
})

app.post("/login",async(request,response)=>{
    const {username,password,role} = request.body 
    const selectedQuery =  `SELECT  * FROM users WHERE username = ?`
    const dbResponse = await db.get(selectedQuery,[username]) 
    if (dbResponse===undefined){
        response.send("User doesn't exist")
    }
    else{
        const isPasswordMatch = await bcrypt.compare(password,dbResponse.password)
        if (isPasswordMatch===true){
            const payload = {username,role}
            const jwtToken = jwt.sign(payload,"vinodsecretepassword")
            response.send({jwtToken:jwtToken})
        }
        else{
            response.send("Invalid password")
        }
    }
})
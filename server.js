const express = require('express')
const path = require('path')
const cors= require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const { stat } = require('fs')
const { request, get } = require('http')
const app = express()
app.use(cors())
app.use(express.json())

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
    const dbUser = await db.get(selectedQuery,[username])
    if (dbUser===undefined){
        const createNewUserQuery = `INSERT INTO users(username,email,password,role) 
        VALUES('${username}','${email}','${hashedPassword}','${role}')` 
        const dbResponse = await db.run(createNewUserQuery)
        response.status(200).json({message:"User Created Successfully"})
    }
    else{
        response.status(400).json({message:"User already exist"})
    }
})

app.post("/login",async(request,response)=>{
    const {username,password,role} = request.body 
    const selectedQuery =  `SELECT  * FROM users WHERE username = ?`
    const dbResponse = await db.get(selectedQuery,[username]) 
    if (dbResponse===undefined){
        response.status(200).json({message:"User doesn't exist"})
    }
    else{
        const isPasswordMatch = await bcrypt.compare(password,dbResponse.password)
        if (isPasswordMatch===true){
            const payload = { userId: dbResponse.id, username, role }
            console.log(payload)
            const jwtToken = jwt.sign(payload,"vinodsecretepassword")
            response.send({jwtToken:jwtToken})
        }
        else{
            response.status(400).send({message:"Invalid password"})
        }
    }
})

const authenticationToken=(request,response,next)=>{
    let jwtToken ;
    const authHeader = request.headers['authorization']
    if (authHeader!==undefined){
        jwtToken=authHeader.split(" ")[1];
    }
    if (jwtToken===undefined){
        response.status(401)
        response.send("Invalid Token")
    }
    else{
        jwt.verify(jwtToken,"vinodsecretepassword",async(error,payload)=>{
            if (error){
                response.status(401)
                response.send("Invalid Token")
            }
            else{
                request.users=payload
                next()
            }
        })
    }
}

app.post("/tasks",authenticationToken,async(request,response)=>{
    const {taskName,taskDescription,status} = request.body 
    const user_Id = request.users.userId 
    const newTaskQuery = `INSERT INTO tasks(task_name,task_description,status,userId) 
    VALUES (?,?,?,?)` 
    const result = await db.run(newTaskQuery,[taskName,taskDescription,status,user_Id])
    const taskId = result.lastID 
    response.send({taskId:taskId})

})

app.get("/taskItems", authenticationToken, async (request, response) => {
    try {
        const {status} = request.query
        const user_Id=request.users.userId
        const getTasksList = `SELECT * FROM tasks WHERE userId = ? AND status = ?`; 
        const result = await db.all(getTasksList,[user_Id,status]);
        response.send(result);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        response.status(500).send({ message: "Failed to retrieve tasks" });
    }
});


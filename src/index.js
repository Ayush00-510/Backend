// require('dotenv').config({path: './env'})

import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
    path: './env'
})






connectDB()









// Connecting mongoDB Using index.js
/*
import express from "express";
const app = express();

( async() =>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error",(error)=>{
            console.log("error",error);
            throw error
        })
        
        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on PORT: ${.process.env.PORT}`);
        })
    } catch (error) {
        console.error("Error: ",error);
        throw err
    }
})()
*/
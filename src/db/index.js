import express from "express";
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async() =>{
    try {
        const whatConnected = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MONGOBD Connected !! : ${whatConnected.connection.host}`); 
    } catch (error) {
        console.log("MONGODB Connection ERROR: ",error);
        process.exit(1);
    }
}


export default connectDB
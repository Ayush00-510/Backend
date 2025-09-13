import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


// Method to Generate the Access and Refresh Token:
const generateAccessAndRefreshToken = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        
        return{accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh Token");
    }
}

const registerUser = asyncHandler( async (req,res) =>{
    
    
    const { fullName , email, username, password } = req.body
    console.log("email", email);

    // For single data checking 
    // if(fullName === ""){
    //     throw new ApiError(400, "fullname is required");
    // }

    // For multiple data check 
    if([fullName,username,email,password].some((field)=>field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{email},{username}]
    })

    if(existedUser){
        throw new ApiError(409, "Already existed username or email -- Recheck")
    }

    console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length()>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath? await uploadOnCloudinary(coverImageLocalPath) : null;
    
    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

    
})

const loginUser = asyncHandler( async (req,res) => {
    // Todos 
    // req body-> data;
    // username or email
    // find user
    // Password check
    // Access and Refresh token
    // Send cookies
    
    // req body-> data;
    const {username, email, password} = req.body
    console.log(email)
    // username or email
    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }
    
    // find user
    const user = await User.findOne({ $or: [{username},{email}] });
    
    if(!user){
        throw new ApiError(404, "User does not exist")
    }
    
    
    // Password check
    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if( !isPasswordValid){
        throw new ApiError(401,"Invalid Credentials : Password");
    }
    
    
    // Access and Refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
    
    const loggedInUser = await User.findById(user._id);

    // Send cookies
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken,refreshToken
            },
            "User Logged in Successfully !!"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }

    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json( new ApiResponse(200,{},"User logged out"))
})

const refreshAccessToken = asyncHandler( async(req,res) =>{

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError (401, "Unauthorised request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError (401, "Invalid refresh token")
        }
        
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError (401, "Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("accessToken",accessToken.options)
        .cookie("newRefreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, refreshToken: newRefreshToken
                },
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword, conforPassword} =req.body;

    if(!(newPassword === conforPassword)){
        throw new ApiError(400, "Recheck the confirm and New Password")
    }
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid oldPassword, Recheck the Password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res 
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"))

})

const getCurrentUser = asyncHandler(async(req,res) =>{
    return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully")
})

const updateAccountsDetails = asyncHandler(async(req,res)=>{

    const {fullName,email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiError(
        200,user,"Account details updated successfully"
    ))

})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Avatar url is missing,while uploading using cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new : true}
    ).select("-password")
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverLocalPath = req.file?.path;

    if(!coverLocalPath){
        throw new ApiError(400, "Cover file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Cover url is missing,while uploading using cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover Image updated successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountsDetails,
    updateUserAvatar,
    updateUserCoverImage
}
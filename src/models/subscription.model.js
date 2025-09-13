import mongoose,{Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,  // Who will subscribe -- Subscriber
        ref: User
    },
    channel: {
        type: Schema.Types.ObjectId,  // Who will be subscribed-- Channel
        ref: User
    }
},{timestamps: true})

export const Subscription = mongoose.model("Subscription",subscriptionSchema)
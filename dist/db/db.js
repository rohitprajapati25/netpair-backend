import mongoose from 'mongoose';
const connectDb = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ims';
    if (!uri) {
        console.error("MONGO_URI not set in environment");
        throw new Error("Missing MONGO_URI");
    }
    try {
        await mongoose.connect(uri);
        console.log("MongoDb Connected...");
    }
    catch (err) {
        console.error("MongoDB connection error:", err);
        // rethrow so caller knows connection failed
        throw err;
    }
};
export default connectDb;
//use rolewise login using context api and 
//# sourceMappingURL=db.js.map
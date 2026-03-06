import dotenv from 'dotenv'
dotenv.config();
import app from '../src/app'
import conectedDb from '../src/db/db'
import { superAdmin } from "../src/utils/superAdmin";
import authRoutes from "./routes/auth.routes";



conectedDb();
superAdmin();
app.use("/api/auth", authRoutes);

app.listen(5000,()=>{
    console.log("http://localhost:5000")
})
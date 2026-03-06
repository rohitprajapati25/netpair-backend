import express from 'express'
import cors from 'cors'
import adminRoutes from '../src/routes/adminRoutes'
const app = express()

app.use(cors())
app.use(express.json())

app.use("/api/admin", adminRoutes);


module.exports = app;
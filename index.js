const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app  = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.stv3jdc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db("restaurantDB").collection('menu')
    const reviewCollection = client.db("restaurantDB").collection('review')
    const cartsCollection = client.db("restaurantDB").collection('carts')


    // get menu

    app.get('/menu', async(req,res)=>{
        const cursor = menuCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })
    // get review

    app.get('/review', async(req,res)=>{
        const cursor = reviewCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })

    // post carts

    app.post('/carts', async(req,res)=>{
      const cartsItem = req.body;
      const result = await cartsCollection.insertOne(cartsItem)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res)=>{
    res.send('Bistro Boss Is Running...')
})

app.listen(port,()=>{
    console.log(`Bistro Boss  server is running on port ${port}`)
})
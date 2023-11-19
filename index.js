const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const app  = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const usersCollection = client.db("restaurantDB").collection('users')


    // jwt related api

    app.post('/jwt', async(req,res)=>{
    
      const user = req.body;
      const token=jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res.send({token})
    })

    // middleware
    const verifyToken = (req,res,next)=>{
      console.log('inside verify token',req.headers)
      if(!req.headers.authorization){
        return res.status(401).send({message:'forbidden access'})
      }
      const token = req.headers.authorization.split(' ')[1]
      // next()
    }

    // user related


    app.get('/users', verifyToken, async(req,res)=>{
   
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.patch('/users/admin/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          role:'admin'
        }
      }
      const result = await usersCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.delete('/users/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    app.post('/users', async(req,res)=>{
      const user = req.body;

      // insert email if user dosen't exists

      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query)
      if(existingUser){
        return res.send({message:'user already exists', insertedId:null})
      }

      const result = await usersCollection.insertOne(user)
      res.send(result)
    })


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

    // get carts

    app.get('/carts', async(req,res)=>{
      let query = {}
        if(req.query?.email){
            query = {email: req.query.email}
        }
      const cursor = cartsCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

     // delete carts

    app.delete('/carts/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartsCollection.deleteOne(query)
      res.send(result)
      // console.log(id)
    })

 


    // post carts

    app.post('/carts', async(req,res)=>{
      const cartsItem = req.body;
      const result = await cartsCollection.insertOne(cartsItem)
      res.send(result)
    })

  //   app.delete('/carts/:id', async(req,res)=>{
  //     const id  = req.params.id;
  //     const query ={_id: new ObjectId(id)}
  //     const result = await cartsCollection.deleteOne(query);
  //     res.send(result)
  // })

  // app.delete('/carts/:id', async(req,res)=>{
  //   const id = req.params.id;
  //   const query = {_id: new ObjectId(id)}
  //   const result = await cartsCollection.deleteOne(query)
  //   res.send(result)
  // })

   

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
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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
    const paymentCollection = client.db("restaurantDB").collection('payments')


    // jwt relatepayment

    app.post('/jwt', async(req,res)=>{
    
      const user = req.body;
      const token=jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res.send({token})
    })



    // middleware
    const verifyToken = (req,res,next)=>{
      // console.log('inside verify token',req.headers.authorization)
      if(!req.headers.authorization){
        return res.status(401).send({message:'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          return res.status(401).send({message:'unauthorized access'})
        }
        req.decoded=decoded;
        next()
      })
    }



    // use verify admin after verify token

   const verifyAdmin = async (req,res,next)=>{
    const email = req.decoded.email;
    const query = {email: email}
    const user = await usersCollection.findOne(query)
    const isAdmin = user?.role==='admin';
    if(!isAdmin){
      return res.status(403).send({message:'forbidden access'})
    }
    next()
   }



    // user related


    app.get('/users', verifyToken, verifyAdmin, async(req,res)=>{
   
      const result = await usersCollection.find().toArray()
      res.send(result)
    })



    // check user admin or not

    app.get('/users/admin/:email', verifyToken, async(req,res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message:'forbidden access'})
      }

      const query = {email:email}
      const user = await usersCollection.findOne(query)
      let admin = false;
      if(user){
        admin = user?.role==='admin'
      }
      res.send({admin})
    })



    app.patch('/users/admin/:id', verifyToken,verifyAdmin, async(req,res)=>{
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



    app.delete('/users/:id', verifyToken, verifyAdmin, async(req,res)=>{
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

    // menu related api

    // get menu

    app.get('/menu', async(req,res)=>{
        const cursor = menuCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })

    // post menu

    app.post('/menu', verifyToken,verifyAdmin, async(req,res)=>{
      const item = req.body;
      const result = await menuCollection.insertOne(item)
      res.send(result)
    })

    // delete menu

    app.delete('/menu/:id', verifyToken, verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: (id)}
      const result = await menuCollection.deleteOne(query)
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



    // payment intent

    app.post('/create-payment-intent', async(req,res)=>{
      const {price}=req.body;
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({ error: 'Invalid or missing price value.' });
      }
      const amount = parseInt(price*100)
      console.log(amount)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })

    })

    // save payment and delete items from the cart

    app.post('/payments', async(req,res)=>{
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment)

      // carefully delete each item from the cart

      console.log('payment info', payment)
      const query = { _id: {
        $in: payment.cardIds.map(id=> new ObjectId(id))

      }};

      const deleteResult = await cartsCollection.deleteMany(query)

      res.send({paymentResult, deleteResult })

    })

    // get

    app.get('/payments/:email', verifyToken, async(req,res)=>{
      const query = {email: req.params.email}
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message:'forbidden access'})
      }
      const result= await paymentCollection.find(query).toArray()
      res.send(result)
    })

  //  stats or analytics

  app.get('/admin-stats', verifyToken, verifyAdmin, async(req,res)=>{
    const users = await usersCollection.estimatedDocumentCount()
    const menuItems = await menuCollection.estimatedDocumentCount()
    const orders = await paymentCollection.estimatedDocumentCount()

    // this is not the best way

    // const payments = await paymentCollection.find().toArray()
    // const revenue = payments.reduce((total, payment)=> total + payment.price,0)

    const result = await paymentCollection.aggregate([
      {
        $group:{
          _id: null,
          totalRevenue:{
            $sum: '$price'
          }
        }
      }
    ]).toArray();

    const revenue = result.length > 0 ? result[0].totalRevenue : 0;

    res.send({
      users,
      menuItems,
      orders,
      revenue
    }) 
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
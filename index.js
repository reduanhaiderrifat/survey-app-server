const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u9zrvau.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const userCollection = client.db("survey").collection("users");
    const surveyorCollection = client.db("survey").collection("surveyors");

  // --------------------------
  //user related api
    //alluser get
    app.get("/users/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const { email, uid } = user;
      if (!email || !uid) {
        return res.status(400).send({ message: "Please email or uid" });
      }
      const query = { $or: [{ email: email }, { uid: uid }] };
      const isExit = await userCollection.findOne(query);
      if (isExit) {
        return res.status(409).send({ message: "User already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.status(201).send(result);
    });
    
    // surveyor related api
    app.get("/survey/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { useruid: uid };
      const result = await surveyorCollection.find(query).toArray();
      res.send(result);
    });
    app.get('/surveyUpdate/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)}; 
      const result = await surveyorCollection.findOne(query);
      res.send(result);
    })
    app.post("/surveys", async (req, res) => {
      const surveyor = req.body;
      surveyor.status = "publish";
      surveyor.timestamp = new Date();
      const result = await surveyorCollection.insertOne(surveyor);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("survey server is running");
});

app.listen(port, () => {
  console.log(`server is running on http://localhost:${port}`);
});

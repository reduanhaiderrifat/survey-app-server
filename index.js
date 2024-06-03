const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const stripe = require("stripe")(process.env.DB_STRIPE_KEY);
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
    const userSurveyCollection = client.db("survey").collection("userSurvey");
    const reportCollection = client.db("survey").collection("report");
    const commentCollection = client.db("survey").collection("comment");
    const paymentCollection = client.db("survey").collection("payment");
    //--------------jwt----------------
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.DB_SECRET_JWT, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //-------------------jwt end------------------------

    // ..middles ware
    const verifyToken = (req, res, next) => {
      console.log(req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ massage: "Forbidden Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).send({ massage: "Forbidden Access" });
      }
      jwt.verify(token, process.env.DB_SECRET_JWT, (err, decoded) => {
        if (err) {
          return res.status(403).send({ massage: "Forbidden Access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    // --------------------------
    //user related api
    //alluser get
    app.get("/users/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/user/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const result = await userCollection.findOne(query);
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
    app.get("/surveyUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await surveyorCollection.findOne(query);
      res.send(result);
    });
    app.get("/ids/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        $or: [
          { voteId: new ObjectId(id) }, 
          { voteId: id }, 
        ],
      }
      if (query) {
        const result = await userSurveyCollection.find(query).toArray();
        res.send(result);
      }
    });
    app.post("/surveys", async (req, res) => {
      const surveyor = req.body;
      surveyor.status = "publish";
      surveyor.timestamp = new Date();
      const result = await surveyorCollection.insertOne(surveyor);
      res.send(result);
    });

    app.put("/survey/:id", async (req, res) => {
      const id = req.params.id;
      const surveyor = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: { ...surveyor },
      };
      const result = await surveyorCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    //get user api
    app.get("/allSurvey", verifyToken, async (req, res) => {
      const result = await surveyorCollection
        .find({ status: "publish" })
        .toArray();
      res.send(result);
    });
    app.get("/userSurvey/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await surveyorCollection.findOne(query);
      res.send(result);
    });
    app.get("/pro-user/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    app.patch("/userVote/:id", async (req, res) => {
      const id = req.params.id;
      const { vote } = req.body;
      const voteparseInt = parseInt(vote, 10);
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: { "options.vote": voteparseInt },
      };
      const result = await surveyorCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.post("/userSurveyPost", async (req, res) => {
      const userSurvey = req.body;
      const result = await userSurveyCollection.insertOne(userSurvey);
      res.send(result);
    });
    //report api user
    app.get("/report/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const result = await reportCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/report", async (req, res) => {
      const report = req.body;
      const result = await reportCollection.insertOne(report);
      res.send(result);
    });
    app.post("/comment", async (req, res) => {
      const report = req.body;
      const result = await commentCollection.insertOne(report);
      res.send(result);
    });
    app.delete("/report/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reportCollection.deleteOne(query);
      res.send(result);
    });
//admin 
app.get('/adminUsers', async (req, res) => {
  const { status } = req.query;
  let query = {};
  if (status) {
    query = { role: status };
  }
  const result = await userCollection.find(query).toArray();
  res.send(result);
});
app.patch('/adminUpdate/:id',async(req,res)=>{
  const id=req.params.id;
  const {role} = req.body;
  const query = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: { role: role },
  }
  const result = await userCollection.updateOne(query, updateDoc);
  res.send(result)

})
    //stripe pyment api
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });
    app.patch("/updatedRole/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const updateDoc = { $set: { role: "Pro-User" } };
      const result = await userCollection.updateOne(query, updateDoc);
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

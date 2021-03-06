// Dependencies 
var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars"); 

// Our scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

 var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make views a static folder
app.use(express.static("views"));

// Connect to the Mongo DB
 //mongoose.connect("mongodb://localhost/newsScrape", { useNewUrlParser: true });

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/newsScrape', { useNewUrlParser: true });


// var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

// mongoose.connect(MONGODB_URI);

// or???
// var MONGOLAB_PUCE_URI = process.env.MONGOLAB_PUCE_URI || "mongodb://localhost/newsScrape";

// mongoose.connect(MONGOLAB_PUCE_URI);

// Set Handlebars
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


// Routes 
// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
    // First, we grab the body of the html with axios
    axios.get("https://www.nytimes.com/section/world").then(function(response) {
      // Then, we load that into cheerio and save it to $ for a shorthand selector
      var $ = cheerio.load(response.data);
  
      // Now, we grab every tag, and do the following:
      $("#stream-panel ol li div div a").each(function(i, element) {
        // Save an empty result object
        var result = {};
  
        // Add the text and href of every link, and save them as properties of the result object
        result.title = $(this).children("h2").text();
        result.link = $(this).attr("href");
        result.summary = $(this).children("p").text();
  
        // Create a new Article using the `result` object built from scraping
        db.Article.create(result)
          .then(function(dbArticle) {
            // View the added result in the console
            console.log(dbArticle);
          })
          .catch(function(err) {
            // If an error occurred, log it
            console.log(err);
          });
      });
  
      // Send a message to the client
      res.send("Scrape Complete");
    });
  });

  // Route for getting all Articles from the db
app.get("/", function(req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
      .then(function(dbArticle) {
        console.log(dbArticle)
        // If we were able to successfully find Articles, send them back to the client
        res.render("index", {articles: dbArticle}); 
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });
  
  // Route for grabbing a specific Article by id, populate it with it's note
  app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
      // ..and populate all of the comments associated with it
      .populate("comment")
      .then(function(dbArticle) {
        console.log(dbArticle)
        // If we were able to successfully find an Article with the given id, send it back to the client
        res.render("article", {article: dbArticle}); 
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });

    // Route for Delete an article 
    app.post("/articles/delete/:id", function(req, res) {
      // Article id to find and update it's saved boolean 
      db.Article.findOneAndUpdate({ "_id": req.params.id }, {"saved": false, "notes": []})
      .then(function(err, doc) {
        if (err) {
          console.log(err); 
        }
        else {
          res.send(doc); 
        }
      }); 
    }); 
  
  // Route for saving/updating an Article's associated Comment
  app.post("/articles/:id/comments", function(req, res) {
    // Create a comment note and pass the req.body to the entry
    db.Comment.create(req.body)
      .then(function(dbComment) {
        // If a comment was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new comment
        // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
        // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
        return db.Article.findOneAndUpdate({ _id: req.params.id }, { comment: dbComment._id }, { new: true });
      })
      .then(function(dbArticle) {
        // If we were able to successfully update an Article, send it back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });

  // Delete a comment 
  // app.delete("/")
  
  // Start the server
   app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
   });
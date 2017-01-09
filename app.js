var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var sessions = require('client-sessions');
var bcrypt = require('bcryptjs');
var csrf = require('csurf');


mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


//connect to mongo 
mongoose.connect('mongodb://localhost/auth');

var User = mongoose.model('User', new Schema({
    id:ObjectId,
    firstName:String,
    lastName:String,
    email:{ type: String, unique:true},
    password:String,
}));




var app = express();

app.set('view engine','jade');
app.locals.pretty=true;


//middleware functions

//app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));



app.use(sessions({  
    cookieName:'session',
    secret:'sdfg2345sdswklpwenwj13423sdsw',
    duration:30*60*60*1000,
    activeDuration:5*60*1000,
    httpOnly:true, //dont let browser js access cookies
    //secure:true, //only use cookies over https
    ephemeral:true, //delete this cookie when the browser is closed
}));
 
app.use(csrf()); 

app.use(function(req,res,next){
    //console.log("stuck in middleware");
    if(req.session && req.session.user){        
        User.findOne({email:req.session.user.email}, function (err,user) { 
            if(user){
                req.user = user;
                delete req.user.password;
                req.session.user = req.user;
                res.locals.user = req.user;
            }
            next();
         });
    }else{
        next();
    }
});

function requireLogin(req,res,next){
    if(!req.user){
        res.redirect('/login');
    }
    else{
        next();
    }
};

app.get('/',function (req,res) { 
    res.render('index.jade');
 });

app.post('/register',function (req,res) { 

    var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));

    var user = new User({
        firstName:req.body.firstName,
        lastName:req.body.lastName,
        email:req.body.email,
        password:hash
    });
   // res.render('register.jade');

   user.save(function (err) { 
       if(err){
           var err ="Something bad happened.. Please try again!";
           if(err.code === 11000){
               error = 'That email is already taken, try another!';
           }

           res.render('register.jade',{error:err});
       }
       else{
           console.log("it went in");
           res.redirect('/dashboard');
       }
    });
   
 });

 app.get('/register',function (req,res) { 
   res.render('register.jade',{csrfToken: req.csrfToken()});
   //res.json(req.body);
 });


app.get('/login',function (req,res) { 
    res.render('login.jade',{csrfToken: req.csrfToken()});
 });

app.post('/login',function(req,res){
    User.findOne({ email: req.body.email}, function(err,user){
        if(!user){
            res.render('login.jade',{error: 'Invalid email or password.'});
        }
        else{
            if(bcrypt.compareSync(req.body.password,user.password)){
                req.session.user = user; //set-cookie: session={email:'...',password:'...'............}
                res.redirect('/dashboard');
            }
            else{
                res.render('login.jade',{error: 'Invalid email or password.'});
            }
        }
    }); 
}) ;

app.get('/dashboard',requireLogin,function (req,res) {
                res.render('dashboard.jade');
 });

 app.get('/logout',function (req,res) { 
     req.session.reset();
    res.redirect('/');
 });



app.listen(3000);




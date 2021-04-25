const path = require('path');
// eslint-disable-next-line no-unused-vars
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');

const app = express();
const server = require('http').createServer(app);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const LocalMongoose = require('passport-local-mongoose');

const mongoDB = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_URI}/${process.env.MONGO_DBNAME}?retryWrites=true&w=majority`;
mongoose.connect(mongoDB);
const db = mongoose.connection;

// Mongoose Schema & Models
const UserSchema = mongoose.Schema({
  username: String,
  email: String,
  fname: String,
  lname: String,
  faculty: String,
  department: String,
  programme: String,
  graduatingYear: Number,
  picture: String,
  biography: String,
  featuredWorks: String,
  sm_facebook: String,
  sm_twitter: String,
  sm_instagram: String,
  sm_linkedin: String,
});
UserSchema.plugin(LocalMongoose);
const User = mongoose.model('User', UserSchema);

const ProgrammeSchema = mongoose.Schema({
  faculty: String,
  department: String,
  programme: String,
}, { collection: 'programmes' });
const Programme = mongoose.model('Programme', ProgrammeSchema);

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to DB');
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: new Date(9999999999999),
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// use static authenticate method of model in LocalStrategy
passport.use(new LocalStrategy(User.authenticate()));
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({
  limit: '5mb',
  extended: true,
}));

app.post('/register', (req, res, next) => {
  User.register(new User({
    fname: req.body.firstname,
    lname: req.body.lastname,
    email: req.body.email,
    username: req.body.username.toLowerCase(),
    faculty: req.body.faculty,
    department: req.body.department,
    programme: req.body.programme,
    graduatingYear: req.body.year,
    picture: req.body.picture || '/static/dp.png',
    biography: '',
    featuredWorks: '',
    sm_facebook: req.body.facebook || '',
    sm_twitter: req.body.twitter || '',
    sm_instagram: req.body.instagram || '',
    sm_linkedin: req.body.linkedin || '',
  }), req.body.password, (err) => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

app.post('/login', (req, res, next) => {
  req.body.username = req.body.username.toLowerCase();
  next();
},

passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/');
});

app.get('/signout', (req, res) => {
  if (!req.user) return res.redirect('/login');
  req.logout();
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.render('home');
});

app.get('/home', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.redirect('/');
});

app.get('/profile', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.render('userprofile', { user: req.user });
});

app.get('/profile/:username', (req, res) => {
  if (!req.user) return res.redirect('/login');
  User.findByUsername(req.params.username).then((userProfile) => {
    if (userProfile) {
      res.render('profile', { user: userProfile });
    } else {
      res.redirect('/');
    }
  });
});

app.get('/about', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.render('about');
});

app.get('/api/profile', (req, res) => {
  if (!req.user) return res.status(403).send('Unauthorized API Usage.');
  res.json(req.user);
});

app.post('/api/edit/bio', (req, res) => {
  if (!req.user) return res.status(403).send('Unauthorized API Usage.');
  User.findByIdAndUpdate(req.user.id, {
    biography: req.body.biography,
  }, () => {
    res.send('Successfully Edited!');
  });
});

app.post('/api/edit/works', (req, res) => {
  if (!req.user) return res.status(403).send('Unauthorized API Usage.');
  User.findByIdAndUpdate(req.user.id, {
    featuredWorks: req.body.featuredworks,
  }, () => {
    res.send('Successfully Edited!');
  });
});

app.get('/api/userlist', (req, res) => {
  User.find({}, (err, result) => {
    res.json(result);
  });
});

app.get('/api/userlist/f/:faculty', (req, res) => {
  User.find({ faculty: req.params.faculty }, (err, result) => {
    res.json(result);
  });
});

app.get('/api/userlist/d/:department', (req, res) => {
  User.find({ department: req.params.department }, (err, result) => {
    res.json(result);
  });
});

app.get('/api/userlist/p/:programme', (req, res) => {
  User.find({ programme: req.params.programme }, (err, result) => {
    res.json(result);
  });
});

app.get('/api/progdata', (req, res) => {
  Programme.distinct('faculty', {}, (err, result) => {
    res.json(result);
  });
});

app.get('/api/progdata/:faculty', (req, res) => {
  Programme.distinct('department', { faculty: req.params.faculty }, (err, result) => {
    res.json(result);
  });
});

app.get('/api/progdata/:faculty/:department', (req, res) => {
  Programme.distinct('programme', {
    faculty: req.params.faculty,
    department: req.params.department,
  }, (err, result) => {
    res.json(result);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`[INFO2602] Listening on *:${process.env.PORT}`);
});

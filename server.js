const express = require("express");
const path = require("path");
const session = require("express-session");
const mysql = require("mysql");
const dotenv = require("dotenv");
const app = express();

dotenv.config({ path: './.env' });

// the details of the database we want to connect to
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

//connect to the database
db.connect((error) => {
    if (error) {
        console.log(error);
    } else {
        console.log("MySQL connected!");
    }
});
 
app.set('view engine', 'ejs');
app.use('/public/styles', express.static(path.join(__dirname, 'public', 'styles')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    rolling: true,
    cookie: { expires: 300000 }
}));

app.get('/', (req, res) => {
    if (req.session.loggedIn) {
        res.render('index', { username: req.session.username });
    } else {
        res.render('login');
    }
});

app.get("/login", (req, res) => {
    if (req.session.loggedIn) {
        res.render('index', { username: req.session.username });
    } else {
        res.render('login');
    }
});

app.get("/register", (req, res) => {
    if (req.session.loggedIn) {
        res.render('index', { username: req.session.username });
    } else {
        res.render('register');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        } else {
            console.log("Session destroyed");
            res.render('login', { message: 'Logged out successfully' });
        }
    });
});
 
app.listen(3000, () => {
  console.log(`Server is running at http://localhost:3000`);
});

const bcrypt = require("bcryptjs");

//configure express.js server to receive the form values as JSON

app.use(express.urlencoded({ extended: 'true' }));
app.use(express.json());

app.post("/auth/login", (req, res) => {
    const { email, enteredPassword } = req.body;
    db.query(`SELECT password, name, userID FROM login_details where email='${email}'`, async (error, result) => {
        if (error) {
            console.log(error);
        }

        if (result.length > 0) {
            bcrypt.compare(enteredPassword, result[0].password, (err, data) => {
                //if error than throw error
                if (err) {
                    console.log(err);
                }
                //if both match
                if (data) {
                    req.session.loggedIn = true;
                    req.session.username = result[0].name;
                    console.log("logged in");
                    res.render('index', { message: 'Logged in successfully!', username: req.session.username});
                } else {
                    //Wrong credentials
                    console.log("wrong credentials");
                    res.render('login', { message: 'Incorrect credentials' });
                }
            });
        } else {
            console.log("The user has not been registered");
            res.render('login', { message: 'The user has not been registered' });
        }
    });
});

app.post("/auth/register", (req, res) => {
    const { name, email, password, password_confirm } = req.body;

    //check if email is already on the database so the user cannot register multiple times
    db.query(`SELECT email FROM login_details WHERE email='${email}'`, async (error, result) => {
        //if there is error print this
        if (error) {
            console.log(error);
        }

        //if passwords are not matching or email already in database
        if (result.length > 0) {
            console.log("email exists");
            res.render('register', { message: 'This email already exists' });
        } else if (password !== password_confirm) {
            res.render('register', { message: 'Passwords do not match' });
        }

        //user can be added to database
        //encrypt the password and add to database along with other details
        let hashedPassword = await bcrypt.hash(password, 8);

        db.query('INSERT INTO login_details SET?', { name: name, email: email, password: hashedPassword }, async (err, result1) => {
            if (err) {
                console.log(err);
            } else {
                console.log("User registered. now login");
                res.render('login');
            }
        });
    });
});

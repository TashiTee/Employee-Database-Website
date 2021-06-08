/*********************************************************************************
* WEB322 – Assignment 06
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part of this
* assignment has been copied manually or electronically from any other source (including web sites) or
* distributed to other students.
*
* Name: Tashi Tsering Student ID: 114763170 Date:  2019-04-03
*
* Online (Heroku) Link: https://quiet-mesa-33001.herokuapp.com/
*
********************************************************************************/ 

const dataService = require("./data-service.js");
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const app = express();
const path = require("path");
const expHandlebars = require('express-handlebars');
const bodyParser = require('body-parser');
const clientSessions = require('client-sessions');  
const dataServiceAuth = require('./data-service-auth.js');


var HTTP_PORT = process.env.PORT || 8080;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


  
  // setup client sessions
  app.use(clientSessions({
    cookieName: 'session',
    secret: 'web322assignment6',
    duration: 5 * 60 * 1000,
    activeDuration: 5 * 1000 * 60
  }));
  
  const ensureLogin = (req, res, next) => {
    if (!req.session.user)
      res.redirect('/login');
    else
      next();
  }

  app.use((req, res, next) => { 
    res.locals.session = req.session;
    next();
  });


app.engine('.hbs', expHandlebars({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
    navLink: function(url, options){
        return '<li' +
        ((url == app.locals.activeRoute) ? ' class="active" ' : '') +
        '><a href="' + url + '">' + options.fn(this) + '</a></li>';
       },
       equal: function (lvalue, rvalue, options) {
        if (arguments.length < 3)
            throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
            return options.inverse(this);
        } else {
            return options.fn(this);
        }
       },       
    }
}));
app.set('view engine', '.hbs');

function onHttpStart() {
    console.log("Express http server listening on: " + HTTP_PORT);
}

app.get('/', function (req, res) {
    res.render("home");
});

app.get('/home', function (req, res) {
    res.render("home");
});
app.get('/about', function (req, res) {
    res.render("about");
});

/**
 * EMPLOYEES
 */
app.get('/employees', ensureLogin, (req, res) => {
    var promise;
    if (typeof req.query.status !== 'undefined') {
        promise = dataService.getEmployeesByStatus(req.query.status);
    } else if (typeof req.query.department !== 'undefined') {
        promise = dataService.getEmployeesByDepartment(req.query.department);
    } else if (typeof req.query.manager !== 'undefined') {
        promise = dataService.getEmployeesByManager(req.query.manager);
    } else {
        promise = dataService.getAllEmployees();
    }
    promise.then(function(employees) {
        res.render("employees", {
            employeeList: employees,
        });
    });
    promise.catch(function(messageVal) {
        res.render("employees", {
            employeeList: [],
            message: messageVal,
        });
    });
});

app.get("/employees/add", ensureLogin, (req, res) => {
    var promise = dataService.getDepartments();
    promise.then((data) => {
        res.render("addEmployee", {departments: data});
    }).catch((reason) => {
        res.render("addEmployee", {departments: []});
    });
});

app.get("/employee/:empNum", ensureLogin, (req, res) => {
    // initialize an empty object to store the values
    let viewData = {};
    dataService.getEmployeeByNum(req.params.empNum)
    .then((data) => {
    viewData.data = data; //store employee data in the "viewData" object as "data"
    }).catch(()=>{
    viewData.data = null; // set employee to null if there was an error
    }).then(dataService.getDepartments)
    .then((data) => {
    viewData.departments = data; // store department data in the "viewData" object as "departments"
   
    // loop through viewData.departments and once we have found the departmentId that matches
    // the employee's "department" value, add a "selected" property to the matching
    // viewData.departments object
    for (let i = 0; i < viewData.departments.length; i++) {
    if (viewData.departments[i].departmentId == viewData.data.department) {
    viewData.departments[i].selected = true;
    }
    }
    }).catch(()=>{
    viewData.departments=[]; // set departments to empty if there was an error
    }).then(()=>{
    if(viewData.data == null){ // if no employee - return an error
    res.status(404).send("Employee Not Found");
    }else{
    res.render("employee", { viewData: viewData }); // render the "employee" view
    }
    });
   });
   
app.get("/employee/delete/:empNum", ensureLogin, (req, res) => {
    let promise = dataService.deleteEmployeeByNum(req.params.empNum);
    promise.then(() => {
        res.redirect("/employees");
    }).catch((reason) => {
        res.status(500).send(reason);
    });
});
/**
 * DEPARTMENTS 
 */

app.get('/departments', ensureLogin, (req, res) => {
    var promise = dataService.getDepartments();
    promise.then(function(departments) {
        res.render("departments", {
            departmentList: departments,
        });
    });
    promise.catch(function(messageVal) {
        res.json({message: messageVal});
    });
});

app.get("/departments/add", ensureLogin,(req, res) => {
    res.render("addDepartment");
});

app.get('/department/:id', ensureLogin, (req, res) => {
    let promise = dataService.getDepartmentById(req.params.id);
    promise.then(function(departments) {
        res.render("department", {
            department: departments,
        });
    });
    promise.catch(function(messageVal) {
        res.status(404).send("Department Not Found");
    });
});

app.get("/departments/delete/:departmentId", ensureLogin, (req, res) => {
    let promise = dataService.deleteDepartmentById(req.params.departmentId);
    promise.then(() => {
        res.redirect("/departments");
    }).catch((reason) => {
        res.status(500).send(reason);
    });    
    });


// IMAGES /////////////////////////////////////

app.get("/images/add", (req, res) => {
    res.render("addImage");
});

var storage = multer.diskStorage({
    destination: "./public/images/uploaded",
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });
const upload = multer({storage: storage});

app.post("/images/add", upload.single('imageFile'), ensureLogin,(req, res) => {
    res.redirect("/images");
});
app.get("/images", ensureLogin,(req, res) => {
    fs.readdir("./public/images/uploaded", (err, items) => {
        res.render('images', {
            images: items
        });
    });
});

// ///////////////////////////////////////////////////////////////////////

/**
 * EMPLOYEE POST
 */
app.post("/employees/add",ensureLogin, (req, res) => {
    dataService.addEmployee(req.body).then(() => {
        res.redirect("/employees");
    });
});

app.post("/employee/update", ensureLogin, (req, res) => {
    let promise = dataService.updateEmployee(req.body);
    promise.then(function(employees) {
        res.redirect("/employees");
    });
});

// ////////////////////////////////////////////////////////////////////////////////

/**
 * DEPARTMENT POST
 */


app.post("/departments/add",ensureLogin, (req, res) => {
    dataService.addDepartment(req.body).then(() => {
        res.redirect("/departments");
    });
});

app.post("/department/update", ensureLogin, (req, res) => {
    let promise = dataService.updateDepartment(req.body);
    promise.then(function(departments) {
        res.redirect("/departments");
    });
});

// //////////////////////////////////////////////////////////////////////////////////////
/**
 * Sessions
 */
app.get('/login', (req, res) => {
    res.render('login');
  });
  
  app.get('/register', (req, res) => {
    res.render('register');
  });
  
  app.post('/register', (req, res) => {
    dataServiceAuth.registerUser(req.body)
      .then(() => res.render('register', { successMessage: 'User created' }))
      .catch(err => res.render('register', { errorMessage: err, userName: req.body.userName }));
  });
  
  app.post('/login', (req, res) => {
    req.body.userAgent = req.get('User-Agent');
    dataServiceAuth.checkUser(req.body)
      .then(user => {
        req.session.user = {
          userName: user.userName,
          email: user.email,
          loginHistory: user.loginHistory
        }
        res.redirect('/employees');
      })
      .catch(err => {
        res.render('login', { errorMessage: err, userName: req.body.userName });
      });
  });
  
  app.get('/logout', (req, res) =>{
    req.session.reset();
    res.redirect('/');
  });
  
  app.get('/userHistory', ensureLogin, (req, res) => {
    res.render('userHistory')
  });

// error if anything else /
app.get('*', function(req, res) {
    res.sendFile(__dirname + "/views/404page.html");
});


dataService.initialize()
    .then(dataServiceAuth.initialize())
    .then(() => {
        app.listen(HTTP_PORT, onHttpStart);
    }).catch((err) => {
        console.log("error: " + err);
    });

  


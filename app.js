// ---------------------------Requiring Files,data,etc-----------------------------------
const express=require('express');   
const app=express();              
const methodoverride=require('method-override'); 
app.use(methodoverride("_method"));
const mongoose=require('mongoose');
const ejsmate=require("ejs-mate");
const Quiz_model=require("./models/Quize.js");
const Note_model=require("./models/Notes.js");
const Contact_model=require("./models/Contact.js");
const expresserror=require("./expresserror.js")
const Contact_validate=require("./Validation/Contact_validation.js");
const Note_validation=require("./Validation/Note_validation.js");
const Quiz_validation=require("./Validation/Quiz_validation.js");
const sessions=require("express-session");
const User_model=require("./models/User.js");
const flash=require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local");
app.engine('ejs', ejsmate);
// ------------------------Starting Server-------------------------------------
main()
    .then(()=>{
        console.log("Successful")
    })
    .catch((err)=>{
        console.log("Failure  Reason: ",err);
    });
async function main(){
    await mongoose.connect('mongodb://127.0.0.1:27017/student_portal');
} 
// ----------------------Some Basic Funtion Code-----------------------------------------
app.use(express.urlencoded({ extended:true })); 
app.set("view engine","ejs");   
const path=require("path");
app.listen("8080",(req,res)=>{
    console.log("Server is listening to 8080");
});
app.use(express.json());
app.set("views",path.join(__dirname,"/views"));
app.use(express.static(path.join(__dirname,"public"))); 
const session_options={
    secret:"SomeRandomSecreatKey",
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()+1000*60*60*24*7,  //7days
        maxAge:1000*60*60*24*7,
        httpOnly:true,
    }
}
app.use(sessions(session_options));
app.use(flash())
//login/signup
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User_model.authenticate()));
passport.serializeUser(User_model.serializeUser());
passport.deserializeUser(User_model.deserializeUser());
//flash middleware
app.use((req,res,next)=>{
    res.locals.success=req.flash("Success");
    res.locals.fail=req.flash("Fail");
    res.locals.person=req.user;
    next();
})
//---------------------------wrap ansyn---------------------------------------------------------
const wrapAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
//-------------------------Rounting Paths------------------------------------------------------------
app.get("/calculator",(req, res) => {
    res.render("Components/Calculator/calculator.ejs");
});
app.get("/signup",(req,res)=>{
    res.render("Sign/Sign.ejs");
})
app.post("/signup",wrapAsync(async(req,res,next)=>{
    try{
        let { username, password, email}=req.body;
        console.log(username+" "+password+" "+email);
        const newUser=new User_model({email,username});
        console.log(newUser+"------");
        const registerUser=await User_model.register(newUser,password);
       
        req.login(registerUser,(err)=>{
            if(err){
                next(err);
            }
            req.session.userid=registerUser._id;
            // console.log(req.session.userid)
            req.flash("Success","User Loggedin")
            res.redirect("/login");
        });
       
    }catch(err){
       next(err);
    }
}));
app.get("/login",(req,res)=>{
    res.render("Sign/Login.ejs");
})
app.post("/login",
passport.authenticate("local",{
    failureRedirect:"/login",
    failureFlash:true,
})
,async(req,res,next)=>{
    req.session.userid=req.user._id;
    req.flash("Success","User Login Succesfully")
    res.redirect("/Quiz");
});
// app.get("/demouser",async(req,res)=>{
//     const User1=new User_model({
//         email:"Sagar@gmail.com",
//         username:"Sagar",
//     })
//    const fakeUser=await User_model.register(User1,"Sagar");
//    res.send(fakeUser);
// })
app.get("/Notes",(req, res,next) => {
    res.render("Components/Notes/Notes.ejs");
});
app.post("/Profile",(req,res,next)=>{
    res.render("Password/Password");
})
app.delete("/:id/Note",async (req,res,next)=>{
    let { id }=req.params;
    await Note_model.findByIdAndDelete(id);
    req.flash("Success","Note Deleted SuccesFully")
    res.redirect("/Note");
});
app.delete("/:id/Profile",async (req,res,next)=>{
    let { id }=req.params;
    await User_model.findByIdAndDelete(id);
    req.flash("Success","Profile Deleted SuccesFully")
    res.redirect("/login");
})
app.get("/dict",(req, res) => {
    res.render("Components/Dictionary/dictionary.ejs");
});

app.get("/weather",(req, res) => {
    res.render("Components/Weather/weather.ejs");
});

app.get("/Clock",(req, res) => {
    res.render("Components/Clock/Clock.ejs");
});

app.get("/Quiz",(req, res,next) => {
    if(req.isAuthenticated()){
    res.render("Quiz/Quiz.ejs");
    }else{
        next(new expresserror(500,"User Not Login"))
    }
});
app.get("/Profile",async(req, res,next) => {
    if(req.isAuthenticated()){
        try{
        User_model.find({_id:req.session.userid}).populate('Quize').populate('Notes').then((data)=>{
            // console.log(data[0].email);
            // console.log(data[0].Notes);
            res.render("Profile/Profile.ejs",{ data });
        });
       
       }catch(err){
        next(err);
        }
        }else{
            next(new expresserror(500,"User Not Login"))
    }
   
});
app.get("/Note",(req, res, next) => {  
    if(req.isAuthenticated()){
        try{
        User_model.find({_id:req.session.userid}).populate('Quize').populate('Notes').then((data)=>{
            const N=data[0].Notes;
            console.log(N);
            res.render("Notes/Notes.ejs" ,{ N });
        });
       
       }catch(err){
        next(err);
        }
        }else{
            next(new expresserror(500,"User Not Login"))
    }
});
app.get("/logout",(req,res,next)=>{
    req.logout((err)=>{
        if(err){
            next(err)
        }else{
            res.redirect("/login");
        }
    })
   
})
// fist authenticate->try/catch+validation->save quiz->link quiz with user id..
app.post("/save-quiz",async (req, res, next) => {
    if(req.isAuthenticated()){
    const quizObject={ Total_question: req.body.Total_question, Correct: req.body.Correct };
    console.log(req.session.userid);
    const { error,value }=Quiz_validation(quizObject);
        if(error){
            console.log(error.details[0].message);
            throw new expresserror(500, "Validation failed");
        }else{
        console.log(value);
        const quizInstance = await Quiz_model.create(quizObject);
            try{
            const savedQuiz = await quizInstance.save();
            console.log('Quiz created successfully:', savedQuiz);
            console.log(req.session.userid);
            const user=await User_model.findById(req.session.userid);
            user.Quize.push(savedQuiz._id);
            const s=await user.save();
            console.log(s.Quize)
            }catch (err) {
                // console.error('Error saving Quiz:', err);
                return next(new expresserror(500, "Unable to save Quiz. Check connection."));
            }
        }
    }else{
        next(new expresserror(500,"User not login"))
    }
});
// problem
app.post("/save-Notes",async (req, res, next) => {
    if(req.isAuthenticated()){
    const NoteObject={ Subject: req.body.Subject, content: req.body.content };
    const { error ,value }=Note_validation(NoteObject);
    if(error){
        console.log(error.details[0].message);
        throw new expresserror(500, "Validation failed");
    }else{
        console.log(value);
    const NoteInstance = new Note_model(NoteObject);
    try{
    const savedNote = await NoteInstance.save();
    //  console.log('Notes created successfully:', savedNote);
    const user=await User_model.findById(req.session.userid);
    user.Notes.push(savedNote._id);
    const s=await user.save();
    console.log(s.Quize)
    }catch(err){
         console.error('Error saving Note:', err);
         return next(new expresserror(500, "Unable to save Note. Check connection."));
    }
    }
}else{
    next(new expresserror(500,"User Not login"))
}
});
app.get("/Contact", wrapAsync(async (req, res, next) => {
    if(req.isAuthenticated()){
    res.render("Contact-Us/Contact.ejs");
    }else{
        next(new expresserror(500,"User not login"))
    }
}));
app.post("/Contact", async (req, res, next) => {
    if(req.isAuthenticated()){
        const contactObject = {
            Name: req.body.Name,
            Email: req.body.Email,
            Message: req.body.Message,
            FindUs: req.body.FindUs
        };

        const { error, value } = Contact_validate(contactObject);

        if (error) {
            console.log(error.details[0].message);
            throw new expresserror(500, "Validation failed");
        } else {
            // console.log('Validation passed:', value);

            const ContactInstance = new Contact_model(contactObject);

            try {
                const savedContact = await ContactInstance.save();
                req.flash("Success","Response Sent Succesfully")
                // console.log('Contact created successfully:', savedContact);
                    res.redirect("/Contact");
                
            } catch (err) {
                // console.error('Error saving contact:', err);
                return next(new expresserror(500, "Unable to save contact. Check connection."));
            }
        }
    }else{
        next(new expresserror(500,"User not login"));
    }
});
app.get("*",(req,res,next)=>{
    next(new expresserror(404,"Page Not Found"))
})
//-----------------------------Error Handle Middleware--------------------------------------------
app.use((err, req, res, next) => {
    const status = err.status || 500;
    // res.status(status).send(`Status: ${status}      Message: ${err.message}  Name:${err.name} `);
    req.flash("Fail",`An Error Occured here : ${err.message}`);
    res.redirect("/login");
});